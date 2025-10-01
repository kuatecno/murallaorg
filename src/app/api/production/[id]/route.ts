import { NextRequest, NextResponse } from 'next/server';
import { productionService } from '../production.service';

/**
 * GET /api/production/[id]
 * Get production batch by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const batch = await productionService.getBatch(params.id, tenantId);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    return NextResponse.json(batch);
  } catch (error: any) {
    console.error('Error fetching production batch:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
