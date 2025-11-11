/**
 * Modifier Groups API
 * GET /api/products/[id]/modifier-groups - List all modifier groups for a product
 * POST /api/products/[id]/modifier-groups - Create a new modifier group
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/products/[id]/modifier-groups
 * List all modifier groups for a product (with modifiers)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;
    const { id: productId } = await params;

    const modifierGroups = await prisma.modifierGroup.findMany({
      where: {
        productId,
        tenantId,
        isActive: true,
      },
      include: {
        modifiers: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: modifierGroups,
    });
  } catch (error: any) {
    console.error('Error fetching modifier groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch modifier groups', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products/[id]/modifier-groups
 * Create a new modifier group for a product
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;
    const { id: productId } = await params;

    const body = await request.json();
    const {
      name,
      description,
      isRequired,
      allowMultiple,
      minSelections,
      maxSelections,
      sortOrder,
      modifiers,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Modifier group name is required' },
        { status: 400 }
      );
    }

    // Create modifier group with modifiers
    const modifierGroup = await prisma.modifierGroup.create({
      data: {
        productId,
        name,
        description,
        isRequired: isRequired || false,
        allowMultiple: allowMultiple !== false, // Default true
        minSelections: minSelections || 0,
        maxSelections,
        sortOrder: sortOrder || 0,
        tenantId,
        ...(modifiers &&
          modifiers.length > 0 && {
            modifiers: {
              create: modifiers.map((mod: any, index: number) => ({
                name: mod.name,
                type: mod.type || 'ADD',
                priceAdjustment: mod.priceAdjustment || 0,
                sortOrder: mod.sortOrder || index,
                tenantId,
              })),
            },
          }),
      },
      include: {
        modifiers: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: modifierGroup,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating modifier group:', error);
    return NextResponse.json(
      { error: 'Failed to create modifier group', details: error.message },
      { status: 500 }
    );
  }
}
