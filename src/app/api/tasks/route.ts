/**
 * Tasks API Routes
 * CRUD operations for tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/tasks - List tasks for current tenant
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: auth.tenantId,
      ...(assignedTo && {
        assignments: {
          some: {
            staffId: assignedTo,
          },
        },
      }),
      ...(status && { status }),
      ...(priority && { priority }),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignments: {
            include: {
              staff: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          comments: {
            include: {
              staff: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          _count: {
            select: {
              assignments: true,
              comments: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, priority, dueDate, assignedStaff } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Validate assigned staff if provided
    if (assignedStaff && Array.isArray(assignedStaff)) {
      const staffCount = await prisma.staff.count({
        where: {
          id: { in: assignedStaff },
          tenantId: auth.tenantId,
        },
      });

      if (staffCount !== assignedStaff.length) {
        return NextResponse.json({ error: 'Invalid staff assignments' }, { status: 400 });
      }
    }

    const taskData: any = {
      title: title.trim(),
      description: description?.trim() || null,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      tenantId: auth.tenantId,
      createdById: auth.userId,
    };

    // Create the task
    const task = await prisma.task.create({
      data: {
        ...taskData,
        assignments: assignedStaff && assignedStaff.length > 0
          ? {
              create: assignedStaff.map((staffId: string) => ({
                staffId,
                assignedBy: auth.userId,
              })),
            }
          : undefined,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignments: {
          include: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
