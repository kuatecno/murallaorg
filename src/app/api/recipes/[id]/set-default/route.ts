import { NextRequest, NextResponse } from 'next/server';
import { recipeService } from '../../recipe.service';

/**
 * POST /api/recipes/[id]/set-default
 * Set recipe as default for its product
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

    const { id } = await params;
    const recipe = await recipeService.setDefaultRecipe(id, tenantId);

    return NextResponse.json(recipe);
  } catch (error: any) {
    console.error('Error setting default recipe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
