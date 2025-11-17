/**
 * Individual Task API Routes
 * Update and delete operations for specific tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { getGoogleChatService } from '@/lib/googleChatService';
import { getGoogleTasksSyncService } from '@/lib/googleTasksSyncService';
import { authOptions } from '@/lib/auth';

// GET /api/tasks/[id] - Get specific task
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.task.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
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
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      assignedStaff = [],
    } = body;

    // Check if task exists and belongs to tenant
    const existingTask = await prisma.task.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
      include: {
        assignments: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
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

    // Prepare update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      } else if (existingTask.status === 'COMPLETED' && status !== 'COMPLETED') {
        updateData.completedAt = null;
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    // Update task
    const task = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...updateData,
        assignments: {
          deleteMany: {}, // Remove all existing assignments
          create: assignedStaff.map((staffId: string) => ({
            staffId,
            assignedBy: session.user.id,
          })),
        },
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

    // Update Google Chat if space exists
    if (task.googleChatSpaceId) {
      try {
        const googleChatService = getGoogleChatService();
        
        // Get assigned staff emails
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
          createdBy: `${task.createdBy.firstName} ${task.createdBy.lastName}`,
          assignedTo: assignedStaffData.map(s => s.email),
        };

        if (task.googleChatMessageId) {
          await googleChatService.updateTaskMessage(
            task.googleChatSpaceId,
            task.googleChatMessageId,
            taskNotificationData
          );
        } else {
          // Create new message if none exists
          const messageId = await googleChatService.sendTaskMessage(
            task.googleChatSpaceId,
            taskNotificationData,
            false
          );
          await prisma.task.update({
            where: { id: task.id },
            data: { googleChatMessageId: messageId },
          });
        }

        // Update space members
        if (assignedStaffData.length > 0) {
          await googleChatService.addMembersToSpace(
            task.googleChatSpaceId,
            assignedStaffData.map(s => s.email)
          );
        }
      } catch (chatError) {
        console.error('Failed to update Google Chat:', chatError);
        // Continue even if chat update fails
      }
    }

    // Update Google Task if enabled
    if (process.env.GOOGLE_TASKS_ENABLED === 'true') {
      try {
        const googleTasksSync = getGoogleTasksSyncService();
        await googleTasksSync.updateGoogleTask(task.id);
      } catch (tasksError) {
        console.error('Failed to update Google Task:', tasksError);
        // Continue even if Google Tasks update fails
      }
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if task exists and belongs to tenant
    const existingTask = await prisma.task.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
      select: {
        id: true,
        googleChatSpaceId: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Delete Google Chat space if it exists
    if (existingTask.googleChatSpaceId) {
      try {
        const googleChatService = getGoogleChatService();
        await googleChatService.deleteSpace(existingTask.googleChatSpaceId);
      } catch (chatError) {
        console.error('Failed to delete Google Chat space:', chatError);
        // Continue even if chat deletion fails
      }
    }

    // Delete Google Task if it exists
    if (process.env.GOOGLE_TASKS_ENABLED === 'true') {
      try {
        const googleTasksSync = getGoogleTasksSyncService();
        await googleTasksSync.deleteGoogleTask(existingTask.id);
      } catch (tasksError) {
        console.error('Failed to delete Google Task:', tasksError);
        // Continue even if Google Tasks deletion fails
      }
    }

    // Delete task (cascades will delete assignments and comments)
    await prisma.task.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
