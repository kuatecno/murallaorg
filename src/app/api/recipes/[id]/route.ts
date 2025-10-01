import { NextRequest, NextResponse } from 'next/server';
import { recipeService } from '../recipe.service';

/**
 * GET /api/recipes/[id]
 * Get recipe by ID
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

    const recipe = await recipeService.getRecipe(params.id, tenantId);

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    return NextResponse.json(recipe);
  } catch (error: any) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/recipes/[id]
 * Delete recipe
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    await recipeService.removeIngredient(params.id, params.id, tenantId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
