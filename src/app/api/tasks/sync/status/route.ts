import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/tasks/sync/status
 * Get sync status summary for all tasks
 */
export async function GET(request: NextRequest) {
  try {
    // Get count of tasks by sync status
    const syncStats = await prisma.task.groupBy({
      by: ['syncStatus'],
      _count: {
        id: true,
      },
    });

    // Transform to a more friendly format
    const statusCounts = syncStats.reduce((acc, stat) => {
      if (stat.syncStatus) {
        acc[stat.syncStatus] = stat._count.id;
      }
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json(statusCounts);
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}
