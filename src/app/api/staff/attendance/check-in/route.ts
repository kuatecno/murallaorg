import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, AttendanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/staff/attendance/check-in - Staff checks in
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { staffId, shiftId } = body;

    if (!staffId || !shiftId) {
      return NextResponse.json(
        { success: false, error: 'staffId and shiftId are required' },
        { status: 400 }
      );
    }

    // Get the shift
    const shift = await prisma.shift.findFirst({
      where: {
        id: shiftId,
        tenantId,
        staffId
      }
    });

    if (!shift) {
      return NextResponse.json(
        { success: false, error: 'Shift not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if already checked in today for this shift
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        shiftId_date: {
          shiftId,
          date: today
        }
      }
    });

    if (existingAttendance?.actualCheckIn) {
      return NextResponse.json(
        { success: false, error: 'Already checked in for this shift today' },
        { status: 400 }
      );
    }

    // Calculate if late (with 15-minute grace period)
    const scheduledStart = shift.startTime;
    const gracePeriodMs = 15 * 60 * 1000; // 15 minutes in milliseconds

    // For recurring shifts, scheduledStart is just the time component
    // We need to construct today's scheduled start time
    let todayScheduledStart: Date;
    if (shift.isRecurring) {
      todayScheduledStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        scheduledStart.getHours(),
        scheduledStart.getMinutes(),
        scheduledStart.getSeconds()
      );
    } else {
      todayScheduledStart = scheduledStart;
    }

    const lateThreshold = new Date(todayScheduledStart.getTime() + gracePeriodMs);
    const isLate = now > lateThreshold;
    const minutesLate = isLate
      ? Math.floor((now.getTime() - todayScheduledStart.getTime()) / (60 * 1000)) - 15
      : 0;

    const status: AttendanceStatus = isLate ? 'LATE' : 'ON_TIME';

    // Create or update attendance
    const attendance = await prisma.attendance.upsert({
      where: {
        shiftId_date: {
          shiftId,
          date: today
        }
      },
      update: {
        actualCheckIn: now,
        status,
        minutesLate: minutesLate > 0 ? minutesLate : null
      },
      create: {
        shiftId,
        staffId,
        tenantId,
        date: today,
        scheduledStart: todayScheduledStart,
        scheduledEnd: shift.endTime,
        actualCheckIn: now,
        status,
        minutesLate: minutesLate > 0 ? minutesLate : null
      },
      include: {
        shift: {
          select: {
            name: true,
            startTime: true,
            endTime: true
          }
        }
      }
    });

    // Return sanitized data (no late status for staff)
    return NextResponse.json({
      success: true,
      data: {
        id: attendance.id,
        shiftId: attendance.shiftId,
        date: attendance.date,
        actualCheckIn: attendance.actualCheckIn,
        shift: attendance.shift
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error checking in:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check in' },
      { status: 500 }
    );
  }
}
