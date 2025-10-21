import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT /api/staff/pto/[id]/approve - Approve PTO request
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
    const { approvedBy } = body; // Staff ID of approver (admin)

    // Get PTO request
    const ptoRequest = await prisma.pTORequest.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        staff: true
      }
    });

    if (!ptoRequest) {
      return NextResponse.json(
        { success: false, error: 'PTO request not found' },
        { status: 404 }
      );
    }

    if (ptoRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Cannot approve ${ptoRequest.status.toLowerCase()} request` },
        { status: 400 }
      );
    }

    // Check if staff still has enough days
    const staff = ptoRequest.staff;
    const availableDays = staff.vacationDaysTotal - staff.vacationDaysUsed;
    if (ptoRequest.days > availableDays) {
      return NextResponse.json(
        { success: false, error: 'Staff no longer has enough vacation days' },
        { status: 400 }
      );
    }

    // Update PTO request and staff vacation days in a transaction
    const [updatedRequest] = await prisma.$transaction([
      prisma.pTORequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedBy: approvedBy || null
        },
        include: {
          staff: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              vacationDaysTotal: true,
              vacationDaysUsed: true
            }
          }
        }
      }),
      // Increment vacation days used
      prisma.staff.update({
        where: { id: ptoRequest.staffId },
        data: {
          vacationDaysUsed: {
            increment: ptoRequest.days
          }
        }
      })
    ]);

    // Create attendance records for approved PTO days
    const dates: Date[] = [];
    const currentDate = new Date(ptoRequest.startDate);
    const endDate = new Date(ptoRequest.endDate);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // For each date, find scheduled shifts and mark as APPROVED_PTO
    for (const date of dates) {
      const dayOfWeek = date.getDay();

      // Find shifts for this staff member on this day
      const shifts = await prisma.shift.findMany({
        where: {
          staffId: ptoRequest.staffId,
          tenantId,
          OR: [
            // Recurring shifts for this day
            {
              isRecurring: true,
              dayOfWeek
            },
            // One-time shift on this date
            {
              isRecurring: false,
              specificDate: date
            }
          ]
        }
      });

      // Create attendance records for each shift
      for (const shift of shifts) {
        await prisma.attendance.upsert({
          where: {
            shiftId_date: {
              shiftId: shift.id,
              date
            }
          },
          update: {
            status: 'APPROVED_PTO'
          },
          create: {
            shiftId: shift.id,
            staffId: ptoRequest.staffId,
            tenantId,
            date,
            scheduledStart: shift.startTime,
            scheduledEnd: shift.endTime,
            status: 'APPROVED_PTO'
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error approving PTO request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve PTO request' },
      { status: 500 }
    );
  }
}
