/**
 * Variant Management API
 * PUT /api/variants/[variantId] - Update a variant
 * DELETE /api/variants/[variantId] - Delete a variant
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * PUT /api/variants/[variantId]
 * Update a variant
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ variantId: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;
    const { variantId } = await params;

    const body = await request.json();
    const {
      name,
      displayName,
      useCustomName,
      description,
      sku,
      price,
      costPrice,
      cafePrice,
      rappiPrice,
      pedidosyaPrice,
      uberPrice,
      minStock,
      maxStock,
      images,
      sortOrder,
      isDefault,
      isActive,
    } = body;

    // Check if variant exists and belongs to this tenant
    const existingVariant = await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        tenantId,
      },
    });

    if (!existingVariant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    // If this variant is set as default, unset other defaults for the same product
    if (isDefault) {
      await prisma.productVariant.updateMany({
        where: {
          productId: existingVariant.productId,
          tenantId,
          id: { not: variantId },
        },
        data: {
          isDefault: false,
        },
      });
    }

    const variant = await prisma.productVariant.update({
      where: {
        id: variantId,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(displayName !== undefined && { displayName }),
        ...(useCustomName !== undefined && { useCustomName }),
        ...(description !== undefined && { description }),
        ...(sku !== undefined && { sku }),
        ...(price !== undefined && { price: price ? parseFloat(price) : null }),
        ...(costPrice !== undefined && { costPrice: costPrice ? parseFloat(costPrice) : null }),
        ...(cafePrice !== undefined && { cafePrice: cafePrice ? parseFloat(cafePrice) : null }),
        ...(rappiPrice !== undefined && { rappiPrice: rappiPrice ? parseFloat(rappiPrice) : null }),
        ...(pedidosyaPrice !== undefined && { pedidosyaPrice: pedidosyaPrice ? parseFloat(pedidosyaPrice) : null }),
        ...(uberPrice !== undefined && { uberPrice: uberPrice ? parseFloat(uberPrice) : null }),
        ...(minStock !== undefined && { minStock: minStock ? parseInt(minStock) : null }),
        ...(maxStock !== undefined && { maxStock: maxStock ? parseInt(maxStock) : null }),
        ...(images !== undefined && { images }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      data: variant,
    });
  } catch (error: any) {
    console.error('Error updating variant:', error);
    return NextResponse.json(
      { error: 'Failed to update variant', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/variants/[variantId]
 * Delete a variant
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ variantId: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;
    const { variantId } = await params;

    // Check if variant exists and belongs to this tenant
    const existingVariant = await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        tenantId,
      },
    });

    if (!existingVariant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    await prisma.productVariant.delete({
      where: {
        id: variantId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Variant deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting variant:', error);
    return NextResponse.json(
      { error: 'Failed to delete variant', details: error.message },
      { status: 500 }
    );
  }
}
