/**
 * Tasks Sync API Routes
 * Manual sync operations for Google Tasks integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getGoogleTasksSyncService } from '@/lib/googleTasksSyncService';
import { authOptions } from '@/lib/auth';

// POST /api/tasks/sync - Manual sync for all pending tasks
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (process.env.GOOGLE_TASKS_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Google Tasks integration is disabled' }, { status: 400 });
    }

    const body = await request.json();
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
  } catch (error) {
    console.error('Error in tasks sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/tasks/sync/status - Get sync status for tasks
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (taskId) {
      // Get sync status for specific task
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          tenantId: session.user.tenantId,
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
          tenantId: session.user.tenantId,
        },
        _count: {
          syncStatus: true,
        },
      });

      const summary = syncSummary.reduce((acc, item) => {
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
