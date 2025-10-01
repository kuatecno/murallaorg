import { NextRequest, NextResponse } from 'next/server';
import { productionService } from '../../production.service';

/**
 * POST /api/production/[id]/start
 * Start production batch (consume ingredients)
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

    const batch = await productionService.startProduction(params.id, tenantId);

    return NextResponse.json(batch);
  } catch (error: any) {
    console.error('Error starting production:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
