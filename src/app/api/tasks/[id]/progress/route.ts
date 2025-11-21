/**
 * Quick Progress Update API Route
 * For inline progress updates without full task edit
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PATCH /api/tasks/[id]/progress - Quick progress update
export async function PATCH(
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
        const { progress } = body;

        if (progress === undefined || progress < 0 || progress > 100) {
            return NextResponse.json(
                { error: 'Progress must be between 0 and 100' },
                { status: 400 }
            );
        }

        // Verify task exists and belongs to tenant
        const existingTask = await prisma.task.findFirst({
            where: {
                id: id,
                tenantId: auth.tenantId,
            },
        });

        if (!existingTask) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Update progress and auto-complete if 100%
        const updateData: any = {
            progress: Math.round(progress),
        };

        // Auto-complete task if progress is 100%
        if (progress === 100 && existingTask.status !== 'COMPLETED') {
            updateData.status = 'COMPLETED';
            updateData.completedAt = new Date();
        }

        // Reopen task if progress < 100 and currently completed
        if (progress < 100 && existingTask.status === 'COMPLETED') {
            updateData.status = 'IN_PROGRESS';
            updateData.completedAt = null;
        }

        const task = await prisma.task.update({
            where: { id: id },
            data: updateData,
            select: {
                id: true,
                progress: true,
                status: true,
                completedAt: true,
            },
        });

        return NextResponse.json({ task });
    } catch (error) {
        console.error('Error updating task progress:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
