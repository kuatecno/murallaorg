import { NextRequest, NextResponse } from 'next/server';
import { productionService } from '../production.service';

/**
 * GET /api/production/stats
 * Get production statistics
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

    const stats = await productionService.getProductionStats(tenantId, startDate, endDate);

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching production stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
