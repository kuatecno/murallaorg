/**
 * Delete Task Dependency API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import prisma from '@/lib/prisma';

// DELETE /api/tasks/[id]/dependencies/[depId] - Delete task dependency
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; depId: string }> }
) {
    try {
        const auth = await authenticate(request);
        if (!auth.success || !auth.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, depId } = await params;

        // Verify dependency exists and belongs to the task
        const dependency = await prisma.taskDependency.findFirst({
            where: {
                id: depId,
                taskId: id,
                task: {
                    tenantId: auth.tenantId,
                },
            },
        });

        if (!dependency) {
            return NextResponse.json(
                { error: 'Dependency not found' },
                { status: 404 }
            );
        }

        // Delete dependency
        await prisma.taskDependency.delete({
            where: { id: depId },
        });

        return NextResponse.json({
            success: true,
            message: 'Dependency removed successfully',
        });
    } catch (error) {
        console.error('Error deleting task dependency:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
