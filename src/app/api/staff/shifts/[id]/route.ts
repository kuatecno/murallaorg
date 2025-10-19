import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT /api/staff/shifts/[id] - Update shift
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const {
      name,
      staffId,
      startTime,
      endTime,
      isRecurring,
      dayOfWeek,
      specificDate
    } = body;

    // Verify shift exists and belongs to tenant
    const existingShift = await prisma.shift.findFirst({
      where: {
        id,
        tenantId
      }
    });

    if (!existingShift) {
      return NextResponse.json(
        { success: false, error: 'Shift not found' },
        { status: 404 }
      );
    }

    // If staffId is being changed, verify new staff exists
    if (staffId && staffId !== existingShift.staffId) {
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
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (staffId !== undefined) updateData.staffId = staffId;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (isRecurring !== undefined) {
      updateData.isRecurring = isRecurring;
      if (isRecurring) {
        updateData.dayOfWeek = dayOfWeek;
        updateData.specificDate = null;
      } else {
        updateData.dayOfWeek = null;
        updateData.specificDate = specificDate ? new Date(specificDate) : null;
      }
    }

    const shift = await prisma.shift.update({
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
      data: shift
    });
  } catch (error) {
    console.error('Error updating shift:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update shift' },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/shifts/[id] - Delete shift
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const { id } = params;

    // Verify shift exists and belongs to tenant
    const existingShift = await prisma.shift.findFirst({
      where: {
        id,
        tenantId
      }
    });

    if (!existingShift) {
      return NextResponse.json(
        { success: false, error: 'Shift not found' },
        { status: 404 }
      );
    }

    // Delete shift (cascade will delete related attendances)
    await prisma.shift.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Shift deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting shift:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete shift' },
      { status: 500 }
    );
  }
}
