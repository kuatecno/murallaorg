import { NextRequest, NextResponse } from 'next/server';
import { recipeService } from './recipe.service';

/**
 * GET /api/recipes
 * List all recipes (optionally filtered by product)
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
      const recipes = await recipeService.getProductRecipes(productId, tenantId);
      return NextResponse.json(recipes);
    }

    // Could add a general list recipes endpoint if needed
    return NextResponse.json({ error: 'productId parameter required' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/recipes
 * Create a new recipe
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await request.json();

    const recipe = await recipeService.createRecipe({
      ...body,
      tenantId,
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error: any) {
    console.error('Error creating recipe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
