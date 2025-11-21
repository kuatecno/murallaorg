/**
 * Project Tasks API Route
 * Get all tasks for a specific project
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/projects/[id]/tasks - Get all tasks for a project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify project exists and belongs to tenant
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        tenantId: auth.tenantId,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const parentTaskId = searchParams.get('parentTaskId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = {
      projectId: params.id,
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
    console.error('Error fetching project tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
