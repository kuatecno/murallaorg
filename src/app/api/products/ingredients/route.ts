import { NextRequest, NextResponse } from 'next/server';
import { productService } from '../product.service';

/**
 * GET /api/products/ingredients
 * Get all products that can be used as ingredients (INPUT and MANUFACTURED)
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const ingredients = await productService.getIngredientsProducts(tenantId);

    return NextResponse.json(ingredients);
  } catch (error: any) {
    console.error('Error fetching ingredients:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
