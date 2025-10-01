import { NextRequest, NextResponse } from 'next/server';
import { productionService } from '../../production.service';

/**
 * POST /api/production/[id]/complete
 * Complete production batch (add to stock)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { actualQuantity, laborCost, overheadCost } = body;

    if (!actualQuantity || actualQuantity <= 0) {
      return NextResponse.json(
        { error: 'actualQuantity is required and must be greater than 0' },
        { status: 400 }
      );
    }

    const { id } = await params;

    const batch = await productionService.completeProduction(
      id,
      actualQuantity,
      laborCost,
      overheadCost,
      tenantId
    );

    return NextResponse.json(batch);
  } catch (error: any) {
    console.error('Error completing production:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
