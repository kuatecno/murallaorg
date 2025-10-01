import { NextRequest, NextResponse } from 'next/server';
import { recipeService } from '../../recipe.service';

/**
 * POST /api/recipes/[id]/ingredients
 * Add ingredient to recipe
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
    const { id } = await params;

    const ingredient = await recipeService.addIngredient(id, body, tenantId);

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error: any) {
    console.error('Error adding ingredient:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
