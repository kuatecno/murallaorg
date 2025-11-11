/**
 * Modifier Groups API
 * GET /api/modifier-groups - List all modifier groups (for reuse)
 * POST /api/modifier-groups - Create a global modifier group
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/modifier-groups
 * List all modifier groups for reuse
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;

    const { searchParams } = new URL(request.url);
    const includeGlobal = searchParams.get('includeGlobal') === 'true';
    const productId = searchParams.get('productId');

    // Build where clause
    const where: any = {
      tenantId,
      isActive: true,
    };

    if (includeGlobal) {
      // Include both global (productId = null) and product-specific groups
      where.OR = [
        { productId: null }, // Global groups
        ...(productId ? [{ productId }] : []), // Specific product groups if productId provided
      ];
    } else if (productId) {
      where.productId = productId;
    } else {
      where.productId = null; // Only global groups
    }

    const modifierGroups = await prisma.modifierGroup.findMany({
      where,
      include: {
        modifiers: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const transformedGroups = modifierGroups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      isRequired: group.isRequired,
      allowMultiple: group.allowMultiple,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      sortOrder: group.sortOrder,
      isGlobal: !group.productId,
      product: group.product,
      modifiers: group.modifiers.map(modifier => ({
        id: modifier.id,
        name: modifier.name,
        type: modifier.type,
        priceAdjustment: Number(modifier.priceAdjustment),
        cafePriceAdjustment: modifier.cafePriceAdjustment ? Number(modifier.cafePriceAdjustment) : null,
        rappiPriceAdjustment: modifier.rappiPriceAdjustment ? Number(modifier.rappiPriceAdjustment) : null,
        pedidosyaPriceAdjustment: modifier.pedidosyaPriceAdjustment ? Number(modifier.pedidosyaPriceAdjustment) : null,
        uberPriceAdjustment: modifier.uberPriceAdjustment ? Number(modifier.uberPriceAdjustment) : null,
        sortOrder: modifier.sortOrder,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: transformedGroups,
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
 * POST /api/modifier-groups
 * Create a global modifier group (not tied to a specific product)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;

    const body = await request.json();
    const {
      name,
      description,
      isRequired = false,
      allowMultiple = true,
      minSelections = 0,
      maxSelections,
      modifiers = [],
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Modifier group name is required' },
        { status: 400 }
      );
    }

    // Create the global modifier group
    const modifierGroup = await prisma.modifierGroup.create({
      data: {
        productId: null, // Global group
        name,
        description,
        isRequired,
        allowMultiple,
        minSelections,
        maxSelections,
        sortOrder: 0,
        isActive: true,
        tenantId,
      },
    });

    // Create modifiers if provided
    if (modifiers.length > 0) {
      for (const modifier of modifiers) {
        await prisma.productModifier.create({
          data: {
            modifierGroupId: modifierGroup.id,
            name: modifier.name,
            type: modifier.type || 'ADD',
            priceAdjustment: modifier.priceAdjustment || 0,
            cafePriceAdjustment: modifier.cafePriceAdjustment,
            rappiPriceAdjustment: modifier.rappiPriceAdjustment,
            pedidosyaPriceAdjustment: modifier.pedidosyaPriceAdjustment,
            uberPriceAdjustment: modifier.uberPriceAdjustment,
            sortOrder: modifier.sortOrder || 0,
            isActive: true,
            tenantId,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: modifierGroup.id,
        name: modifierGroup.name,
        description: modifierGroup.description,
        modifiersCount: modifiers.length,
      },
      message: 'Global modifier group created successfully',
    });

  } catch (error: any) {
    console.error('Error creating modifier group:', error);
    return NextResponse.json(
      { error: 'Failed to create modifier group', details: error.message },
      { status: 500 }
    );
  }
}
