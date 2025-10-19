import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, PTOStatus } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/staff/pto - List PTO requests
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
    const status = searchParams.get('status') as PTOStatus | null;

    const where: any = { tenantId };
    if (staffId) where.staffId = staffId;
    if (status) where.status = status;

    const ptoRequests = await prisma.pTORequest.findMany({
      where,
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
      },
      orderBy: {
        requestedDate: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: ptoRequests
    });
  } catch (error) {
    console.error('Error fetching PTO requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch PTO requests' },
      { status: 500 }
    );
  }
}

// POST /api/staff/pto - Create PTO request
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
    const { staffId, startDate, endDate, reason } = body;

    if (!staffId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'staffId, startDate, and endDate are required' },
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

    // Calculate days requested
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const daysRequested = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end day

    // Check if staff has enough vacation days
    const availableDays = staff.vacationDaysTotal - staff.vacationDaysUsed;
    if (daysRequested > availableDays) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient vacation days. Requested: ${daysRequested}, Available: ${availableDays}`
        },
        { status: 400 }
      );
    }

    const ptoRequest = await prisma.pTORequest.create({
      data: {
        staffId,
        tenantId,
        startDate: start,
        endDate: end,
        daysRequested,
        reason: reason || null,
        requestedDate: new Date(),
        status: 'PENDING'
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
      data: ptoRequest
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating PTO request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create PTO request' },
      { status: 500 }
    );
  }
}
