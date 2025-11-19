/**
 * Tasks Sync API Routes
 * Manual sync operations for Google Tasks integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getGoogleTasksSyncService } from '@/lib/googleTasksSyncService';

// POST /api/tasks/sync - Manual sync for all pending tasks
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (process.env.GOOGLE_TASKS_ENABLED !== 'true') {
      return NextResponse.json({
        success: false,
        message: 'Google Tasks integration is disabled'
      }, { status: 200 });
    }

    // Check if user has Google Tasks enabled
    const user = await prisma.staff.findUnique({
      where: { id: auth.userId },
      select: {
        googleTasksEnabled: true,
        googleAccessToken: true,
      },
    });

    if (!user?.googleTasksEnabled || !user?.googleAccessToken) {
      return NextResponse.json({
        success: false,
        error: 'Google Tasks not connected',
        message: 'Please connect your Google account first'
      }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { taskId, direction = 'bidirectional' } = body;

    const googleTasksSync = getGoogleTasksSyncService();

    if (taskId) {
      // Sync specific task
      let success = false;
      
      if (direction === 'to-google') {
        success = await googleTasksSync.updateGoogleTask(taskId);
      } else if (direction === 'from-google') {
        success = await googleTasksSync.syncFromGoogle(taskId);
      } else {
        // Bidirectional sync
        success = await googleTasksSync.updateGoogleTask(taskId);
        if (success) {
          await googleTasksSync.syncFromGoogle(taskId);
        }
      }

      return NextResponse.json({ 
        success,
        message: success ? 'Task synced successfully' : 'Task sync failed'
      });
    } else {
      // Sync all pending tasks
      await googleTasksSync.runSyncForPendingTasks();
      
      return NextResponse.json({ 
        success: true,
        message: 'Pending tasks sync initiated'
      });
    }
  } catch (error: any) {
    console.error('Error in tasks sync:', error);

    const errorMessage = error?.message || 'Internal server error';

    // Handle specific error cases
    if (errorMessage.includes('Google Tasks not enabled')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Tasks not connected',
          message: 'Please connect your Google account first'
        },
        { status: 400 }
      );
    }

    if (errorMessage.includes('refresh') || errorMessage.includes('token')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication expired',
          message: 'Please reconnect your Google account'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Sync failed',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

// GET /api/tasks/sync/status - Get sync status for tasks
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (taskId) {
      // Get sync status for specific task
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          tenantId: auth.tenantId,
        },
        select: {
          id: true,
          title: true,
          syncStatus: true,
          lastSyncAt: true,
          googleTaskId: true,
          googleTasksUpdatedAt: true,
        },
      });

      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      return NextResponse.json({ task });
    } else {
      // Get sync status summary for all tasks
      const syncSummary = await prisma.task.groupBy({
        by: ['syncStatus'],
        where: {
          tenantId: auth.tenantId,
        },
        _count: {
          syncStatus: true,
        },
      });

      const summary = syncSummary.reduce((acc: Record<string, number>, item: any) => {
        acc[item.syncStatus] = item._count.syncStatus;
        return acc;
      }, {} as Record<string, number>);

      return NextResponse.json({ 
        summary,
        enabled: process.env.GOOGLE_TASKS_ENABLED === 'true'
      });
    }
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
