/**
 * Sync Status API
 * GET /api/sync/status - Get sync status and last sync information
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get tenant
    const tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        settings: true,
        updatedAt: true
      }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'No active tenant found' },
        { status: 404 }
      );
    }

    // Get last sync info from tenant settings
    const settings = tenant.settings as any || {};
    const lastSync = settings.lastOpenFacturaSync || null;

    // Get current document count
    const documentCount = await prisma.taxDocument.count({
      where: { tenantId: tenant.id }
    });

    // Get document statistics
    const documentStats = await prisma.taxDocument.groupBy({
      by: ['status'],
      where: { tenantId: tenant.id },
      _count: {
        status: true
      }
    });

    // Get recent documents (last 7 days)
    const recentCount = await prisma.taxDocument.count({
      where: {
        tenantId: tenant.id,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    // Calculate time since last sync
    let timeSinceLastSync = null;
    let nextSyncDue = null;

    if (lastSync && lastSync.endTime) {
      const lastSyncTime = new Date(lastSync.endTime);
      timeSinceLastSync = Date.now() - lastSyncTime.getTime();

      // Next sync is due 24 hours after last sync
      nextSyncDue = new Date(lastSyncTime.getTime() + 24 * 60 * 60 * 1000);
    }

    // Transform stats to friendly format
    const statsMap = documentStats.reduce((acc, stat) => {
      acc[stat.status.toLowerCase()] = stat._count.status;
      return acc;
    }, {} as Record<string, number>);

    const response = {
      tenant: {
        id: tenant.id,
        name: tenant.name
      },
      sync: {
        lastSync: lastSync ? {
          ...lastSync,
          startTime: lastSync.startTime,
          endTime: lastSync.endTime,
          duration: lastSync.endTime && lastSync.startTime ?
            new Date(lastSync.endTime).getTime() - new Date(lastSync.startTime).getTime() : null
        } : null,
        timeSinceLastSync,
        nextSyncDue,
        isOverdue: nextSyncDue ? new Date() > nextSyncDue : false
      },
      documents: {
        total: documentCount,
        recent: recentCount,
        byStatus: {
          approved: statsMap.approved || 0,
          draft: statsMap.draft || 0,
          rejected: statsMap.rejected || 0,
          cancelled: statsMap.cancelled || 0
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting sync status:', error);

    return NextResponse.json(
      {
        error: 'Failed to get sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}