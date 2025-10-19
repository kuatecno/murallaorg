import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, AttendanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/staff/attendance/check-out - Staff checks out
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

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get the attendance record
    const attendance = await prisma.attendance.findUnique({
      where: {
        shiftId_date: {
          shiftId,
          date: today
        }
      },
      include: {
        shift: true
      }
    });

    if (!attendance) {
      return NextResponse.json(
        { success: false, error: 'No check-in found for this shift today' },
        { status: 404 }
      );
    }

    if (attendance.staffId !== staffId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (attendance.actualCheckOut) {
      return NextResponse.json(
        { success: false, error: 'Already checked out' },
        { status: 400 }
      );
    }

    // Calculate total hours worked
    const checkInTime = attendance.actualCheckIn!;
    const hoursWorked = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

    // Determine if early departure
    const scheduledEnd = attendance.scheduledEnd;
    let todayScheduledEnd: Date;
    if (attendance.shift.isRecurring) {
      todayScheduledEnd = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        scheduledEnd.getHours(),
        scheduledEnd.getMinutes(),
        scheduledEnd.getSeconds()
      );
    } else {
      todayScheduledEnd = scheduledEnd;
    }

    const isEarlyDeparture = now < todayScheduledEnd;

    // Update status if leaving early (but preserve LATE if already late)
    let newStatus = attendance.status;
    if (isEarlyDeparture && attendance.status === 'ON_TIME') {
      newStatus = 'EARLY_DEPARTURE';
    }

    const updatedAttendance = await prisma.attendance.update({
      where: {
        id: attendance.id
      },
      data: {
        actualCheckOut: now,
        totalHours: Math.round(hoursWorked * 100) / 100, // Round to 2 decimals
        status: newStatus
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

    // Return sanitized data (no late/early status for staff)
    return NextResponse.json({
      success: true,
      data: {
        id: updatedAttendance.id,
        shiftId: updatedAttendance.shiftId,
        date: updatedAttendance.date,
        actualCheckIn: updatedAttendance.actualCheckIn,
        actualCheckOut: updatedAttendance.actualCheckOut,
        totalHours: updatedAttendance.totalHours,
        shift: updatedAttendance.shift
      }
    });
  } catch (error) {
    console.error('Error checking out:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check out' },
      { status: 500 }
    );
  }
}
