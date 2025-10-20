import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, EventStatus } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/events - List events
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
    const status = searchParams.get('status') as EventStatus | null;
    const category = searchParams.get('category');
    const upcoming = searchParams.get('upcoming') === 'true';

    const where: any = { tenantId };

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (upcoming) {
      where.startDate = { gte: new Date() };
      where.status = { not: 'CANCELLED' };
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            attendees: true
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST /api/events - Create event
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
      title,
      description,
      startDate,
      endDate,
      location,
      imageUrl,
      imagePublicId,
      category,
      maxAttendees,
      isPublic,
      createdById
    } = body;

    if (!title || !startDate || !endDate || !createdById) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        imageUrl,
        imagePublicId,
        category: category || 'GENERAL',
        maxAttendees,
        isPublic: isPublic !== false,
        status: 'UPCOMING',
        tenantId,
        createdById
      },
      include: {
        createdBy: {
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
      data: event
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
