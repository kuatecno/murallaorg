/**
 * Task Dependencies API Routes
 * Manage task dependencies (blocking relationships)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/tasks/[id]/dependencies - Get task dependencies
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await authenticate(request);
        if (!auth.success || !auth.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Verify task exists and belongs to tenant
        const task = await prisma.task.findFirst({
            where: {
                id: id,
                tenantId: auth.tenantId,
            },
            include: {
                dependencies: {
                    include: {
                        dependsOnTask: {
                            select: {
                                id: true,
                                title: true,
                                status: true,
                                priority: true,
                                dueDate: true,
                                progress: true,
                                project: {
                                    select: {
                                        id: true,
                                        name: true,
                                        color: true,
                                    },
                                },
                            },
                        },
                    },
                },
                dependentOn: {
                    include: {
                        task: {
                            select: {
                                id: true,
                                title: true,
                                status: true,
                                priority: true,
                                dueDate: true,
                                progress: true,
                                project: {
                                    select: {
                                        id: true,
                                        name: true,
                                        color: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({
            blockedBy: task.dependencies.map(d => ({
                id: d.id,
                dependencyType: d.dependencyType,
                task: d.dependsOnTask,
            })),
            blocking: task.dependentOn.map(d => ({
                id: d.id,
                dependencyType: d.dependencyType,
                task: d.task,
            })),
        });
    } catch (error) {
        console.error('Error fetching task dependencies:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/tasks/[id]/dependencies - Add task dependency
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await authenticate(request);
        if (!auth.success || !auth.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { dependsOnTaskId, dependencyType = 'FINISH_TO_START' } = body;

        if (!dependsOnTaskId) {
            return NextResponse.json(
                { error: 'dependsOnTaskId is required' },
                { status: 400 }
            );
        }

        // Verify both tasks exist and belong to tenant
        const [task, dependsOnTask] = await Promise.all([
            prisma.task.findFirst({
                where: { id: id, tenantId: auth.tenantId },
            }),
            prisma.task.findFirst({
                where: { id: dependsOnTaskId, tenantId: auth.tenantId },
            }),
        ]);

        if (!task || !dependsOnTask) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Prevent self-dependency
        if (id === dependsOnTaskId) {
            return NextResponse.json(
                { error: 'A task cannot depend on itself' },
                { status: 400 }
            );
        }

        // Check for circular dependencies
        const hasCircularDependency = await checkCircularDependency(
            dependsOnTaskId,
            id,
            auth.tenantId
        );

        if (hasCircularDependency) {
            return NextResponse.json(
                { error: 'This would create a circular dependency' },
                { status: 400 }
            );
        }

        // Create dependency
        const dependency = await prisma.taskDependency.create({
            data: {
                taskId: id,
                dependsOnTaskId,
                dependencyType,
            },
            include: {
                dependsOnTask: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                        dueDate: true,
                        progress: true,
                        project: {
                            select: {
                                id: true,
                                name: true,
                                color: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json({ dependency });
    } catch (error: any) {
        console.error('Error creating task dependency:', error);

        // Handle unique constraint violation
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'This dependency already exists' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Helper function to check for circular dependencies
async function checkCircularDependency(
    startTaskId: string,
    targetTaskId: string,
    tenantId: string
): Promise<boolean> {
    const visited = new Set<string>();
    const queue = [startTaskId];

    while (queue.length > 0) {
        const currentTaskId = queue.shift()!;

        if (currentTaskId === targetTaskId) {
            return true; // Circular dependency found
        }

        if (visited.has(currentTaskId)) {
            continue;
        }

        visited.add(currentTaskId);

        // Get all tasks that this task depends on
        const dependencies = await prisma.taskDependency.findMany({
            where: {
                taskId: currentTaskId,
                task: { tenantId },
            },
            select: {
                dependsOnTaskId: true,
            },
        });

        queue.push(...dependencies.map(d => d.dependsOnTaskId));
    }

    return false;
}
