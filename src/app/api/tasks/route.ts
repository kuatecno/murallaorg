/**
 * Tasks API Routes
 * CRUD operations for tasks with Google Chat integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { getGoogleChatService } from '@/lib/googleChatService';
import { authOptions } from '@/lib/auth';

// GET /api/tasks - List tasks for current tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
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
      tenantId: session.user.tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assignedTo) {
      where.assignments = {
        some: {
          staffId: assignedTo,
        },
      };
    }

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      priority = 'MEDIUM',
      dueDate,
      assignedStaff = [],
      createChatSpace = false,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Validate assigned staff
    if (assignedStaff.length > 0) {
      const staffCount = await prisma.staff.count({
        where: {
          id: { in: assignedStaff },
          tenantId: session.user.tenantId,
        },
      });

      if (staffCount !== assignedStaff.length) {
        return NextResponse.json(
          { error: 'One or more assigned staff members not found' },
          { status: 400 }
        );
      }
    }

    const taskData: any = {
      title: title.trim(),
      description: description?.trim() || null,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      tenantId: session.user.tenantId,
      createdById: session.user.id,
    };

    let googleChatSpaceId = null;
    let googleChatMessageId = null;

    // Create Google Chat space if requested
    if (createChatSpace) {
      try {
        const googleChatService = getGoogleChatService();
        
        // Get assigned staff emails for Google Chat
        const assignedStaffData = await prisma.staff.findMany({
          where: {
            id: { in: assignedStaff },
            tenantId: session.user.tenantId,
          },
          select: { email: true },
        });

        const taskNotificationData = {
          taskId: '', // Will be set after task creation
          title: taskData.title,
          description: taskData.description,
          status: 'TODO',
          priority: taskData.priority,
          dueDate: taskData.dueDate?.toISOString(),
          createdBy: `${session.user.firstName} ${session.user.lastName}`,
          assignedTo: assignedStaffData.map(s => s.email),
        };

        googleChatSpaceId = await googleChatService.createTaskSpace(taskNotificationData);
      } catch (chatError) {
        console.error('Failed to create Google Chat space:', chatError);
        // Continue with task creation even if chat space fails
      }
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        ...taskData,
        googleChatSpaceId,
        googleChatMessageId,
        assignments: assignedStaff.length > 0
          ? {
              create: assignedStaff.map((staffId: string) => ({
                staffId,
                assignedBy: session.user.id,
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
            tenantId: session.user.tenantId,
          },
          select: { email: true },
        });

        const taskNotificationData = {
          taskId: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate?.toISOString(),
          createdBy: `${session.user.firstName} ${session.user.lastName}`,
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

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
