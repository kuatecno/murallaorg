import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, PayrollStatus } from '@prisma/client';

const prisma = new PrismaClient();

// PUT /api/staff/payroll/runs/[id] - Update payroll run status
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { status, paidDate, notes } = body;

    // Verify payroll run exists
    const existingRun = await prisma.payrollRun.findFirst({
      where: {
        id,
        tenantId
      }
    });

    if (!existingRun) {
      return NextResponse.json(
        { success: false, error: 'Payroll run not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status as PayrollStatus;
    if (paidDate) updateData.paidAt = new Date(paidDate);
    if (notes !== undefined) updateData.notes = notes;

    const payrollRun = await prisma.payrollRun.update({
      where: { id },
      data: updateData,
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
    });
  } catch (error) {
    console.error('Error updating payroll run:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payroll run' },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/payroll/runs/[id] - Delete payroll run (admin only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const { id } = params;

    // Verify payroll run exists
    const existingRun = await prisma.payrollRun.findFirst({
      where: {
        id,
        tenantId
      }
    });

    if (!existingRun) {
      return NextResponse.json(
        { success: false, error: 'Payroll run not found' },
        { status: 404 }
      );
    }

    // Only allow deletion if not paid
    if (existingRun.status === 'PAID') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete paid payroll runs' },
        { status: 400 }
      );
    }

    await prisma.payrollRun.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Payroll run deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payroll run:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete payroll run' },
      { status: 500 }
    );
  }
}
