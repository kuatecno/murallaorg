import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/staff/attendance/report - Attendance report for a date range (admin only)
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
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const staffId = searchParams.get('staffId'); // Optional filter

    // Default to current month if not specified
    const now = new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    endDate.setHours(23, 59, 59, 999);

    const where: any = {
      tenantId,
      date: {
        gte: startDate,
        lte: endDate
      }
    };

    if (staffId) {
      where.staffId = staffId;
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            hourlyRate: true,
            salaryType: true
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
        { date: 'desc' },
        { actualCheckIn: 'asc' }
      ]
    });

    // Group by staff for summary
    const staffSummary = attendance.reduce((acc, att) => {
      const key = att.staffId;
      if (!acc[key]) {
        acc[key] = {
          staff: att.staff,
          totalDays: 0,
          totalHours: 0,
          onTimeDays: 0,
          lateDays: 0,
          earlyDepartures: 0,
          absences: 0
        };
      }

      acc[key].totalDays += 1;
      acc[key].totalHours += Number(att.totalHours || 0);

      switch (att.status) {
        case 'ON_TIME':
          acc[key].onTimeDays += 1;
          break;
        case 'LATE':
          acc[key].lateDays += 1;
          break;
        case 'EARLY_DEPARTURE':
          acc[key].earlyDepartures += 1;
          break;
        case 'ABSENT':
          acc[key].absences += 1;
          break;
      }

      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate
        },
        attendance,
        summary: Object.values(staffSummary),
        totals: {
          totalRecords: attendance.length,
          totalHours: attendance.reduce((sum, att) => sum + Number(att.totalHours || 0), 0),
          onTime: attendance.filter(a => a.status === 'ON_TIME').length,
          late: attendance.filter(a => a.status === 'LATE').length,
          earlyDeparture: attendance.filter(a => a.status === 'EARLY_DEPARTURE').length,
          absent: attendance.filter(a => a.status === 'ABSENT').length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching attendance report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance report' },
      { status: 500 }
    );
  }
}
