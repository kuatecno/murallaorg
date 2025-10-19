import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/staff/payroll/calculate - Calculate payroll for a staff member
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
    const { staffId, startDate, endDate } = body;

    if (!staffId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'staffId, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    // Get staff info
    const staff = await prisma.staff.findFirst({
      where: {
        id: staffId,
        tenantId
      }
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, error: 'Staff member not found' },
        { status: 404 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get attendance records for the period
    const attendance = await prisma.attendance.findMany({
      where: {
        staffId,
        tenantId,
        date: {
          gte: start,
          lte: end
        },
        actualCheckOut: {
          not: null // Only count completed shifts
        }
      }
    });

    // Calculate based on salary type
    let totalAmount = 0;
    let totalHours = 0;
    let daysWorked = attendance.length;

    attendance.forEach(att => {
      totalHours += Number(att.totalHours || 0);
    });

    if (staff.salaryType === 'HOURLY') {
      // Hourly: total hours * hourly rate
      const hourlyRate = Number(staff.hourlyRate || 0);
      totalAmount = totalHours * hourlyRate;
    } else {
      // Monthly: just use the fixed salary
      totalAmount = Number(staff.salary || 0);
    }

    // Calculate deductions (basic example - can be extended)
    const deductions = 0; // TODO: Add tax, social security, etc.
    const netAmount = totalAmount - deductions;

    return NextResponse.json({
      success: true,
      data: {
        staff: {
          id: staff.id,
          firstName: staff.firstName,
          lastName: staff.lastName,
          email: staff.email,
          salaryType: staff.salaryType,
          salary: staff.salary,
          hourlyRate: staff.hourlyRate
        },
        period: {
          startDate: start,
          endDate: end
        },
        calculation: {
          daysWorked,
          totalHours: Math.round(totalHours * 100) / 100,
          grossAmount: Math.round(totalAmount * 100) / 100,
          deductions: Math.round(deductions * 100) / 100,
          netAmount: Math.round(netAmount * 100) / 100
        },
        attendance: attendance.map(att => ({
          date: att.date,
          hours: att.totalHours,
          status: att.status
        }))
      }
    });
  } catch (error) {
    console.error('Error calculating payroll:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate payroll' },
      { status: 500 }
    );
  }
}
