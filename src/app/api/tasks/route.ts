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
    const projectId = searchParams.get('projectId');
    const parentTaskId = searchParams.get('parentTaskId');
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
      ...(projectId && { projectId }),
      ...(parentTaskId !== undefined && {
        parentTaskId: parentTaskId === 'null' ? null : parentTaskId
      }),
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
          project: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          subtasks: {
            select: {
              id: true,
              title: true,
              status: true,
              progress: true,
            },
          },
          parentTask: {
            select: {
              id: true,
              title: true,
            },
          },
          dependencies: {
            include: {
              dependsOnTask: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                },
              },
            },
          },
          _count: {
            select: {
              assignments: true,
              comments: true,
              subtasks: true,
              dependencies: true,
            },
          },
        },
        orderBy: [
          { order: 'asc' },
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
    const {
      title,
      description,
      priority,
      dueDate,
      startDate,
      assignedStaff,
      projectId,
      parentTaskId,
      progress,
      estimatedHours,
      actualHours,
      order,
    } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Validate dates if provided
    if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
      return NextResponse.json({ error: 'Start date must be before due date' }, { status: 400 });
    }

    // Validate project if provided
    if (projectId) {
      const projectExists = await prisma.project.findFirst({
        where: {
          id: projectId,
          tenantId: auth.tenantId,
        },
      });

      if (!projectExists) {
        return NextResponse.json({ error: 'Invalid project' }, { status: 400 });
      }
    }

    // Validate parent task if provided
    if (parentTaskId) {
      const parentTaskExists = await prisma.task.findFirst({
        where: {
          id: parentTaskId,
          tenantId: auth.tenantId,
        },
      });

      if (!parentTaskExists) {
        return NextResponse.json({ error: 'Invalid parent task' }, { status: 400 });
      }
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
      startDate: startDate ? new Date(startDate) : null,
      projectId: projectId || null,
      parentTaskId: parentTaskId || null,
      progress: progress !== undefined ? progress : 0,
      estimatedHours: estimatedHours || null,
      actualHours: actualHours || null,
      order: order !== undefined ? order : 0,
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
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        parentTask: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            subtasks: true,
            dependencies: true,
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
