/**
 * Task Comments API Routes
 * CRUD operations for task comments
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/tasks/[id]/comments - Get task comments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticate(request);
    if (!auth.success || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify task exists and belongs to tenant
    const task = await prisma.task.findFirst({
      where: {
        id: id,
        tenantId: auth.tenantId,
      },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const comments = await prisma.taskComment.findMany({
      where: {
        taskId: id,
      },
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
        createdAt: 'asc',
      },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching task comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[id]/comments - Create task comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticate(request);
    if (!auth.success || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Verify task exists and belongs to tenant
    const task = await prisma.task.findFirst({
      where: {
        id: id,
        tenantId: auth.tenantId,
      },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId: id,
        staffId: auth.userId,
        content: content.trim(),
      },
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
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error creating task comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
