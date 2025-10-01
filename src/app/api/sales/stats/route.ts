import { NextRequest, NextResponse } from 'next/server';
import { salesService } from '../sales.service';

/**
 * GET /api/sales/stats
 * Get sales statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    const stats = await salesService.getSalesStats(tenantId, startDate, endDate);

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching sales stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
