/**
 * Invoice Statistics API Route
 * GET /api/invoices/stats - Get invoice statistics similar to Muralla 4.0
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/invoices/stats
 * Get comprehensive invoice statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get tenant from query parameter or use first available tenant
    let tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      const firstTenant = await prisma.tenant.findFirst({
        where: { isActive: true },
        select: { id: true }
      });

      if (!firstTenant) {
        return NextResponse.json(
          { error: 'No active tenant found. Please contact administrator.' },
          { status: 404 }
        );
      }

      tenantId = firstTenant.id;
    }

    // Execute all queries in parallel for better performance
    const [total, byStatus, byType, recentTotal, totalAmount] = await Promise.all([
      // Total count
      prisma.taxDocument.count({
        where: { tenantId }
      }),

      // Group by status
      prisma.taxDocument.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true },
      }),

      // Group by type
      prisma.taxDocument.groupBy({
        by: ['type'],
        where: { tenantId },
        _count: { type: true },
      }),

      // Recent documents (last 30 days)
      prisma.taxDocument.count({
        where: {
          tenantId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),

      // Total amount for issued documents
      prisma.taxDocument.aggregate({
        where: {
          tenantId,
          status: 'ISSUED'
        },
        _sum: { totalAmount: true },
      }),
    ]);

    // Transform status counts to object format
    const statusCounts = byStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    // Transform type counts to object format
    const typeCounts = byType.reduce((acc, item) => {
      acc[item.type] = item._count.type;
      return acc;
    }, {} as Record<string, number>);

    // Calculate percentage growth (simplified - could be enhanced with historical data)
    const growthRate = recentTotal > 0 ? Math.round((recentTotal / total) * 100) : 0;

    return NextResponse.json({
      total,
      totalAmount: totalAmount._sum.totalAmount ? Number(totalAmount._sum.totalAmount) : 0,
      recentTotal,
      growthRate,
      byStatus: {
        DRAFT: statusCounts.DRAFT || 0,
        ISSUED: statusCounts.ISSUED || 0,
        CANCELLED: statusCounts.CANCELLED || 0,
        REJECTED: statusCounts.REJECTED || 0,
        ...statusCounts
      },
      byType: {
        FACTURA: typeCounts.FACTURA || 0,
        BOLETA: typeCounts.BOLETA || 0,
        NOTA_CREDITO: typeCounts.NOTA_CREDITO || 0,
        NOTA_DEBITO: typeCounts.NOTA_DEBITO || 0,
        GUIA_DESPACHO: typeCounts.GUIA_DESPACHO || 0,
        ...typeCounts
      },
      summary: {
        averageAmount: statusCounts.ISSUED ?
          Math.round(Number(totalAmount._sum.totalAmount || 0) / statusCounts.ISSUED) : 0,
        conversionRate: total > 0 ? Math.round((statusCounts.ISSUED || 0) / total * 100) : 0,
        pendingAmount: 0, // Could be calculated if we track payment status
      }
    });

  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice statistics' },
      { status: 500 }
    );
  }
}