/**
 * Projects API Routes
 * CRUD operations for projects
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/projects - List projects for current tenant
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: auth.tenantId,
      ...(status && { status }),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
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
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    // Calculate project statistics
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const taskStats = await prisma.task.groupBy({
          by: ['status'],
          where: {
            projectId: project.id,
          },
          _count: true,
        });

        const totalTasks = taskStats.reduce((sum, stat) => sum + stat._count, 0);
        const completedTasks = taskStats.find(s => s.status === 'COMPLETED')?._count || 0;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          ...project,
          taskCount: totalTasks,
          completedTaskCount: completedTasks,
          progress,
        };
      })
    );

    return NextResponse.json({
      projects: projectsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color, icon, startDate, endDate } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    // Validate dates if provided
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 });
    }

    const projectData: any = {
      name: name.trim(),
      description: description?.trim() || null,
      color: color || '#3B82F6',
      icon: icon || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      tenantId: auth.tenantId,
      createdById: auth.userId,
    };

    const project = await prisma.project.create({
      data: projectData,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
