/**
 * Product Duplication API
 * POST /api/products/[id]/duplicate - Duplicate a product with all its variants and modifier groups
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

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
    const { newName, newSku, duplicateVariants = true, duplicateModifiers = true } = body;

    // Get the original product with all related data
    const originalProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
      },
      include: {
        variants: {
          orderBy: { sortOrder: 'asc' },
        },
        modifierGroups: {
          include: {
            modifiers: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!originalProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if new SKU already exists
    if (newSku) {
      const existingProduct = await prisma.product.findUnique({
        where: {
          tenantId_sku: {
            tenantId,
            sku: newSku,
          },
        },
      });

      if (existingProduct) {
        return NextResponse.json(
          { error: 'Product with this SKU already exists' },
          { status: 409 }
        );
      }
    }

    // Generate new SKU if not provided
    const finalSku = newSku || `${originalProduct.sku}-COPY-${Date.now()}`;
    const finalName = newName || `${originalProduct.name} (Copy)`;

    // Create the duplicated product
    const duplicatedProduct = await prisma.product.create({
      data: {
        tenantId,
        sku: finalSku,
        name: finalName,
        description: originalProduct.description,
        type: originalProduct.type,
        category: originalProduct.category,
        brand: originalProduct.brand,
        ean: null, // Clear EAN for duplicate
        // sourceUrl: originalProduct.sourceUrl, // Field may not exist in schema
        unitPrice: originalProduct.unitPrice,
        costPrice: originalProduct.costPrice,
        wholesalePrice: originalProduct.wholesalePrice,
        retailPrice: originalProduct.retailPrice,
        currentStock: 0, // Reset stock for duplicate
        minStock: originalProduct.minStock,
        maxStock: originalProduct.maxStock,
        unit: originalProduct.unit,
        // format: originalProduct.format, // Field may not exist in schema
        // tags: originalProduct.tags, // Field may not exist in schema
        hasRecipe: originalProduct.hasRecipe,
        menuSection: originalProduct.menuSection,
        hoy: false, // Don't duplicate "today's special" status
        cafePrice: originalProduct.cafePrice,
        rappiPrice: originalProduct.rappiPrice,
        pedidosyaPrice: originalProduct.pedidosyaPrice,
        uberPrice: originalProduct.uberPrice,
        // images: originalProduct.images, // Field may not exist in schema
        isActive: true,
        // metadata: originalProduct.metadata, // Field may not exist in schema
      },
    });

    // Duplicate variants if requested
    if (duplicateVariants && originalProduct.variants.length > 0) {
      for (const variant of originalProduct.variants) {
        await prisma.productVariant.create({
          data: {
            productId: duplicatedProduct.id,
            name: variant.name,
            displayName: variant.displayName,
            useCustomName: variant.useCustomName,
            description: variant.description,
            sku: variant.sku ? `${variant.sku}-COPY-${Date.now()}` : null,
            // price: variant.price, // Field may not exist in schema
            costPrice: variant.costPrice,
            cafePrice: variant.cafePrice,
            rappiPrice: variant.rappiPrice,
            pedidosyaPrice: variant.pedidosyaPrice,
            uberPrice: variant.uberPrice,
            minStock: variant.minStock,
            maxStock: variant.maxStock,
            // images: variant.images, // Field may not exist in schema
            // sourceUrl: variant.sourceUrl, // Field may not exist in schema
            sortOrder: variant.sortOrder,
            isDefault: variant.isDefault,
            isActive: variant.isActive,
            // metadata: variant.metadata, // Field may not exist in schema
            tenantId,
          },
        });
      }
    }

    // Duplicate modifier groups if requested
    if (duplicateModifiers && originalProduct.modifierGroups.length > 0) {
      for (const group of originalProduct.modifierGroups) {
        const duplicatedGroup = await prisma.modifierGroup.create({
          data: {
            productId: duplicatedProduct.id,
            name: group.name,
            description: group.description,
            isRequired: group.isRequired,
            allowMultiple: group.allowMultiple,
            minSelections: group.minSelections,
            maxSelections: group.maxSelections,
            sortOrder: group.sortOrder,
            isActive: group.isActive,
            tenantId,
          },
        });

        // Duplicate modifiers within the group
        for (const modifier of group.modifiers) {
          await prisma.productModifier.create({
            data: {
              modifierGroupId: duplicatedGroup.id,
              name: modifier.name,
              type: modifier.type,
              priceAdjustment: modifier.priceAdjustment,
              cafePriceAdjustment: modifier.cafePriceAdjustment,
              rappiPriceAdjustment: modifier.rappiPriceAdjustment,
              pedidosyaPriceAdjustment: modifier.pedidosyaPriceAdjustment,
              uberPriceAdjustment: modifier.uberPriceAdjustment,
              sortOrder: modifier.sortOrder,
              isActive: modifier.isActive,
              tenantId,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: duplicatedProduct.id,
        sku: duplicatedProduct.sku,
        name: duplicatedProduct.name,
        originalId: productId,
        duplicatedVariants: duplicateVariants ? originalProduct.variants.length : 0,
        duplicatedModifierGroups: duplicateModifiers ? originalProduct.modifierGroups.length : 0,
      },
      message: 'Product duplicated successfully',
    });

  } catch (error: any) {
    console.error('Error duplicating product:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate product', details: error.message },
      { status: 500 }
    );
  }
}
