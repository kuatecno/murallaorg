import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/staff/attendance/today - Today's attendance (admin only - includes late info)
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // TODO: Add role check - only ADMIN/OWNER should access this
    // const userRole = request.headers.get('x-user-role');
    // if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
    //   return NextResponse.json(
    //     { success: false, error: 'Unauthorized' },
    //     { status: 403 }
    //   );
    // }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await prisma.attendance.findMany({
      where: {
        tenantId,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // Show problems first (ABSENT, LATE)
        { actualCheckIn: 'asc' }
      ]
    });

    // Get all shifts scheduled for today
    const dayOfWeek = today.getDay();
    const scheduledShifts = await prisma.shift.findMany({
      where: {
        tenantId,
        OR: [
          // Recurring shifts for this day
          {
            isRecurring: true,
            dayOfWeek
          },
          // One-time shifts today
          {
            isRecurring: false,
            specificDate: today
          }
        ]
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Find shifts with no check-in (potential absences)
    const checkedInShiftIds = new Set(attendance.map(a => a.shiftId));
    const missingCheckIns = scheduledShifts.filter(shift => !checkedInShiftIds.has(shift.id));

    return NextResponse.json({
      success: true,
      data: {
        attendance, // Full data including late/early status
        scheduledShifts,
        missingCheckIns,
        summary: {
          total: attendance.length,
          onTime: attendance.filter(a => a.status === 'ON_TIME').length,
          late: attendance.filter(a => a.status === 'LATE').length,
          earlyDeparture: attendance.filter(a => a.status === 'EARLY_DEPARTURE').length,
          absent: missingCheckIns.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}
