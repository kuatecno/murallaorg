import { NextRequest, NextResponse } from 'next/server';
import { salesService } from '../sales.service';

/**
 * POST /api/sales/check-availability
 * Check if product can be sold (stock/ingredients available)
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { productId, quantity } = body;

    if (!productId || !quantity) {
      return NextResponse.json(
        { error: 'productId and quantity are required' },
        { status: 400 }
      );
    }

    const result = await salesService.checkAvailability(productId, quantity, tenantId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error checking availability:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
