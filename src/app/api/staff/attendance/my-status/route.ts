import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/staff/attendance/my-status - Get own attendance status (staff view - no late info)
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');

    if (!staffId) {
      return NextResponse.json(
        { success: false, error: 'staffId is required' },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's attendance records
    const todayAttendance = await prisma.attendance.findMany({
      where: {
        staffId,
        tenantId,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true
          }
        }
      }
    });

    // Get upcoming shifts (today + next 7 days)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingShifts = await prisma.shift.findMany({
      where: {
        staffId,
        tenantId,
        OR: [
          // Recurring shifts
          { isRecurring: true },
          // One-time shifts in the next week
          {
            isRecurring: false,
            specificDate: {
              gte: today,
              lte: nextWeek
            }
          }
        ]
      },
      orderBy: [
        { specificDate: 'asc' },
        { startTime: 'asc' }
      ]
    });

    // Sanitize attendance data - remove late/early status
    const sanitizedAttendance = todayAttendance.map(att => ({
      id: att.id,
      shiftId: att.shiftId,
      date: att.date,
      actualCheckIn: att.actualCheckIn,
      actualCheckOut: att.actualCheckOut,
      totalHours: att.totalHours,
      shift: att.shift
    }));

    return NextResponse.json({
      success: true,
      data: {
        today: sanitizedAttendance,
        upcomingShifts
      }
    });
  } catch (error) {
    console.error('Error fetching attendance status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance status' },
      { status: 500 }
    );
  }
}
