/**
 * Task Reorder API Route
 * Handle batch updates for task ordering and status changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PUT /api/tasks/reorder - Batch update task order and status
export async function PUT(request: NextRequest) {
    try {
        const auth = await authenticate(request);
        if (!auth.success || !auth.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { items } = body;

        if (!Array.isArray(items)) {
            return NextResponse.json(
                { error: 'Items array is required' },
                { status: 400 }
            );
        }

        // Verify all tasks belong to the tenant
        const taskIds = items.map((item: any) => item.id);
        const existingTasks = await prisma.task.findMany({
            where: {
                id: { in: taskIds },
                tenantId: auth.tenantId,
            },
            select: { id: true },
        });

        if (existingTasks.length !== taskIds.length) {
            return NextResponse.json(
                { error: 'One or more tasks not found or unauthorized' },
                { status: 403 }
            );
        }

        // Update tasks in a transaction
        await prisma.$transaction(
            items.map((item: any) =>
                prisma.task.update({
                    where: { id: item.id },
                    data: {
                        status: item.status,
                        order: item.order,
                    },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error reordering tasks:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
