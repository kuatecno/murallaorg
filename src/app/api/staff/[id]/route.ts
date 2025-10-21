import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * PUT /api/staff/[id]
 * Update a staff member
 */
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

    // Verify staff exists and belongs to tenant
    const existingStaff = await prisma.staff.findFirst({
      where: {
        id,
        tenantId
      }
    });

    if (!existingStaff) {
      return NextResponse.json(
        { success: false, error: 'Staff member not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.salary !== undefined) updateData.salary = body.salary ? parseFloat(body.salary) : null;
    if (body.salaryType !== undefined) updateData.salaryType = body.salaryType;
    if (body.hourlyRate !== undefined) updateData.hourlyRate = body.hourlyRate ? parseFloat(body.hourlyRate) : null;
    if (body.vacationDaysTotal !== undefined) updateData.vacationDaysTotal = parseInt(body.vacationDaysTotal);

    const staff = await prisma.staff.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('Error updating staff:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update staff member' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/staff/[id]
 * Delete (deactivate) a staff member
 */
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

    // Verify staff exists and belongs to tenant
    const existingStaff = await prisma.staff.findFirst({
      where: {
        id,
        tenantId
      }
    });

    if (!existingStaff) {
      return NextResponse.json(
        { success: false, error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.staff.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      message: 'Staff member deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting staff:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete staff member' },
      { status: 500 }
    );
  }
}
