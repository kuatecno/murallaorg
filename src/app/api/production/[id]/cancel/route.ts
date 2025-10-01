import { NextRequest, NextResponse } from 'next/server';
import { productionService } from '../../production.service';

/**
 * POST /api/production/[id]/cancel
 * Cancel production batch
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { reason } = body;

    const batch = await productionService.cancelBatch(params.id, tenantId, reason);

    return NextResponse.json(batch);
  } catch (error: any) {
    console.error('Error cancelling production:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
