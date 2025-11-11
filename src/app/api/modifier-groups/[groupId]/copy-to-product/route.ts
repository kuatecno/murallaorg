/**
 * Copy Modifier Group to Product API
 * POST /api/modifier-groups/[groupId]/copy-to-product - Copy a modifier group to one or more products
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;
    const { groupId } = await params;

    const body = await request.json();
    const { productIds, replaceExisting = false } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'Product IDs array is required' },
        { status: 400 }
      );
    }

    // Get the source modifier group with all its modifiers
    const sourceGroup = await prisma.modifierGroup.findFirst({
      where: {
        id: groupId,
        tenantId,
        isActive: true,
      },
      include: {
        modifiers: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!sourceGroup) {
      return NextResponse.json(
        { error: 'Modifier group not found' },
        { status: 404 }
      );
    }

    const results = [];
    const errors = [];

    for (const productId of productIds) {
      try {
        // Verify product exists and belongs to tenant
        const product = await prisma.product.findFirst({
          where: {
            id: productId,
            tenantId,
          },
        });

        if (!product) {
          errors.push({ productId, error: 'Product not found' });
          continue;
        }

        // If replaceExisting is true, delete existing modifier groups for this product
        if (replaceExisting) {
          const existingGroups = await prisma.modifierGroup.findMany({
            where: {
              productId,
              tenantId,
            },
            include: {
              modifiers: true,
            },
          });

          // Delete modifiers first, then groups
          for (const group of existingGroups) {
            await prisma.productModifier.deleteMany({
              where: {
                modifierGroupId: group.id,
              },
            });
            await prisma.modifierGroup.delete({
              where: {
                id: group.id,
              },
            });
          }
        }

        // Create the new modifier group for this product
        const newGroup = await prisma.modifierGroup.create({
          data: {
            productId,
            name: sourceGroup.name,
            description: sourceGroup.description,
            isRequired: sourceGroup.isRequired,
            allowMultiple: sourceGroup.allowMultiple,
            minSelections: sourceGroup.minSelections,
            maxSelections: sourceGroup.maxSelections,
            sortOrder: sourceGroup.sortOrder,
            isActive: true,
            tenantId,
          },
        });

        // Copy all modifiers to the new group
        let modifiersCount = 0;
        for (const modifier of sourceGroup.modifiers) {
          await prisma.productModifier.create({
            data: {
              modifierGroupId: newGroup.id,
              name: modifier.name,
              type: modifier.type,
              priceAdjustment: modifier.priceAdjustment,
              cafePriceAdjustment: modifier.cafePriceAdjustment,
              rappiPriceAdjustment: modifier.rappiPriceAdjustment,
              pedidosyaPriceAdjustment: modifier.pedidosyaPriceAdjustment,
              uberPriceAdjustment: modifier.uberPriceAdjustment,
              sortOrder: modifier.sortOrder,
              isActive: true,
              tenantId,
            },
          });
          modifiersCount++;
        }

        results.push({
          productId,
          productName: product.name,
          groupId: newGroup.id,
          groupName: newGroup.name,
          modifiersCount,
        });

      } catch (error: any) {
        console.error(`Error copying modifier group to product ${productId}:`, error);
        errors.push({ productId, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sourceGroup: {
          id: sourceGroup.id,
          name: sourceGroup.name,
          modifiersCount: sourceGroup.modifiers.length,
        },
        results,
        errors,
        totalRequested: productIds.length,
        totalSuccessful: results.length,
        totalFailed: errors.length,
      },
      message: `Successfully copied modifier group to ${results.length} of ${productIds.length} products`,
    });

  } catch (error: any) {
    console.error('Error copying modifier group to products:', error);
    return NextResponse.json(
      { error: 'Failed to copy modifier group', details: error.message },
      { status: 500 }
    );
  }
}
