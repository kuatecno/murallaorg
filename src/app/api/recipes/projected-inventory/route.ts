import { NextRequest, NextResponse } from 'next/server';
import { recipeService } from '../recipe.service';

/**
 * GET /api/recipes/projected-inventory
 * Get projected inventory for all products or specific product
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    if (productId) {
      const inventory = await recipeService.getProjectedInventory(productId, tenantId);
      return NextResponse.json(inventory);
    }

    const allInventory = await recipeService.getAllProjectedInventory(tenantId);
    return NextResponse.json(allInventory);
  } catch (error: any) {
    console.error('Error fetching projected inventory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
