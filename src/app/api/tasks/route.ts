/**
 * Tasks API Routes
 * CRUD operations for tasks with Google Chat integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getGoogleChatService } from '@/lib/googleChatService';
import { getGoogleTasksSyncService } from '@/lib/googleTasksSyncService';

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
    const { title, description, priority, dueDate, assignedStaff, createGoogleChatSpace } = body;

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

    let googleChatSpaceId = null;
    let googleChatMessageId = null;

    // Create Google Chat space if requested
    if (createGoogleChatSpace) {
      try {
        const googleChatService = getGoogleChatService();
        
        const taskNotificationData = {
          taskId: 'temp', // Will be updated after task creation
          title: title.trim(),
          description: description?.trim() || undefined,
          status: 'TODO',
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          createdBy: auth.userId, // Will be updated with actual name after creation
        };

        googleChatSpaceId = await googleChatService.createTaskSpace(taskNotificationData);
      } catch (chatError) {
        console.error('Failed to create Google Chat space:', chatError);
        // Continue even if Chat creation fails
      }
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        ...taskData,
        googleChatSpaceId,
        googleChatMessageId,
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

    // Update Google Chat message with actual task ID
    if (googleChatSpaceId) {
      try {
        const googleChatService = getGoogleChatService();
        const assignedStaffData = await prisma.staff.findMany({
          where: {
            id: { in: assignedStaff },
            tenantId: auth.tenantId,
          },
          select: { email: true },
        });

        const taskNotificationData = {
          taskId: task.id,
          title: task.title,
          description: task.description || undefined,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate?.toISOString(),
          createdBy: `${task.createdBy.firstName} ${task.createdBy.lastName}`,
          assignedTo: assignedStaffData.map(s => s.email),
        };

        googleChatMessageId = await googleChatService.sendTaskMessage(
          googleChatSpaceId,
          taskNotificationData,
          false
        );

        // Update task with message ID
        await prisma.task.update({
          where: { id: task.id },
          data: { googleChatMessageId },
        });

        // Add members to the chat space
        if (assignedStaffData.length > 0) {
          await googleChatService.addMembersToSpace(
            googleChatSpaceId,
            assignedStaffData.map(s => s.email)
          );
        }
      } catch (chatError) {
        console.error('Failed to update Google Chat message:', chatError);
      }
    }

    // Create Google Task if enabled
    if (process.env.GOOGLE_TASKS_ENABLED === 'true') {
      try {
        const googleTasksSync = getGoogleTasksSyncService();
        await googleTasksSync.createGoogleTask(task.id);
      } catch (tasksError) {
        console.error('Failed to create Google Task:', tasksError);
        // Continue even if Google Tasks creation fails
      }
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
