import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT /api/staff/pto/[id]/deny - Deny PTO request
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
    const { deniedBy, denialReason } = body;

    // Get PTO request
    const ptoRequest = await prisma.pTORequest.findFirst({
      where: {
        id,
        tenantId
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
        { success: false, error: `Cannot deny ${ptoRequest.status.toLowerCase()} request` },
        { status: 400 }
      );
    }

    const updatedRequest = await prisma.pTORequest.update({
      where: { id },
      data: {
        status: 'DENIED',
        approvedDate: new Date(), // Use this field for denial date too
        approvedBy: deniedBy || null,
        reason: denialReason || ptoRequest.reason // Optionally update reason with denial reason
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
    });

    return NextResponse.json({
      success: true,
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error denying PTO request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deny PTO request' },
      { status: 500 }
    );
  }
}
