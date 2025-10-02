import { NextRequest, NextResponse } from 'next/server';
import { recipeService } from '../../recipe.service';

/**
 * POST /api/recipes/[id]/duplicate
 * Duplicate a recipe (create new version)
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
    const newRecipe = await recipeService.duplicateRecipe(id, tenantId);

    return NextResponse.json(newRecipe, { status: 201 });
  } catch (error: any) {
    console.error('Error duplicating recipe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
