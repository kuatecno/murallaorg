import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/staff/attendance/live - Who's working right now (admin only)
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's attendance where checked in but not checked out
    const currentlyWorking = await prisma.attendance.findMany({
      where: {
        tenantId,
        date: {
          gte: today,
          lt: tomorrow
        },
        actualCheckIn: {
          not: null
        },
        actualCheckOut: null // Still working
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
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
      orderBy: {
        actualCheckIn: 'asc'
      }
    });

    // Calculate duration for each
    const now = new Date();
    const enrichedData = currentlyWorking.map(att => ({
      ...att,
      hoursWorkedSoFar: Math.round(
        ((now.getTime() - att.actualCheckIn!.getTime()) / (1000 * 60 * 60)) * 100
      ) / 100
    }));

    return NextResponse.json({
      success: true,
      data: {
        count: currentlyWorking.length,
        staff: enrichedData
      }
    });
  } catch (error) {
    console.error('Error fetching live attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch live attendance' },
      { status: 500 }
    );
  }
}
