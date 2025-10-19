import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/staff/shifts - List shifts
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
    const date = searchParams.get('date'); // Specific date
    const startDate = searchParams.get('startDate'); // Date range
    const endDate = searchParams.get('endDate');

    const where: any = { tenantId };

    if (staffId) {
      where.staffId = staffId;
    }

    if (date) {
      // For a specific date, return recurring shifts matching that day AND one-time shifts
      const targetDate = new Date(date);
      const dayOfWeek = targetDate.getDay(); // 0-6

      where.OR = [
        // Recurring shifts for this day of week
        {
          isRecurring: true,
          dayOfWeek: dayOfWeek
        },
        // One-time shifts on this specific date
        {
          isRecurring: false,
          specificDate: targetDate
        }
      ];
    } else if (startDate && endDate) {
      // Date range query
      where.OR = [
        // All recurring shifts (they apply across all dates)
        { isRecurring: true },
        // One-time shifts within the range
        {
          isRecurring: false,
          specificDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      ];
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: [
        { isRecurring: 'desc' }, // Recurring first
        { specificDate: 'asc' }, // Then by date
        { startTime: 'asc' } // Then by start time
      ]
    });

    return NextResponse.json({
      success: true,
      data: shifts
    });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shifts' },
      { status: 500 }
    );
  }
}

// POST /api/staff/shifts - Create shift
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
      name,
      staffId,
      startTime,
      endTime,
      isRecurring,
      dayOfWeek, // Required for recurring
      specificDate // Required for one-time
    } = body;

    // Validation
    if (!name || !staffId || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (isRecurring && dayOfWeek === undefined) {
      return NextResponse.json(
        { success: false, error: 'dayOfWeek is required for recurring shifts' },
        { status: 400 }
      );
    }

    if (!isRecurring && !specificDate) {
      return NextResponse.json(
        { success: false, error: 'specificDate is required for one-time shifts' },
        { status: 400 }
      );
    }

    // Verify staff exists and belongs to tenant
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

    const shift = await prisma.shift.create({
      data: {
        name,
        staffId,
        tenantId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isRecurring: isRecurring || false,
        dayOfWeek: isRecurring ? dayOfWeek : null,
        specificDate: !isRecurring && specificDate ? new Date(specificDate) : null
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
      data: shift
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create shift' },
      { status: 500 }
    );
  }
}
