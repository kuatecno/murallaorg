import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, PayrollStatus } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/staff/payroll/runs - List payroll runs
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
    const status = searchParams.get('status') as PayrollStatus | null;

    const where: any = { tenantId };
    if (staffId) where.staffId = staffId;
    if (status) where.status = status;

    const payrollRuns = await prisma.payrollRun.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            salaryType: true
          }
        }
      },
      orderBy: {
        periodEnd: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: payrollRuns
    });
  } catch (error) {
    console.error('Error fetching payroll runs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payroll runs' },
      { status: 500 }
    );
  }
}

// POST /api/staff/payroll/runs - Create payroll run
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
    const {
      staffId,
      periodStart,
      periodEnd,
      hoursWorked,
      grossAmount,
      deductions,
      netAmount,
      notes
    } = body;

    if (!staffId || !periodStart || !periodEnd || grossAmount === undefined || netAmount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify staff exists
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

    const payrollRun = await prisma.payrollRun.create({
      data: {
        staffId,
        tenantId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        hoursWorked: hoursWorked || 0,
        regularPay: grossAmount,
        overtimePay: 0,
        deductions: deductions || 0,
        totalPay: grossAmount,
        netPay: netAmount,
        status: 'PENDING',
        notes: notes || null
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

    return NextResponse.json({
      success: true,
      data: payrollRun
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating payroll run:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payroll run' },
      { status: 500 }
    );
  }
}
