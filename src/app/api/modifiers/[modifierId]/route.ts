/**
 * Modifier Management API
 * PUT /api/modifiers/[modifierId] - Update a modifier
 * DELETE /api/modifiers/[modifierId] - Delete a modifier
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * PUT /api/modifiers/[modifierId]
 * Update a modifier
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ modifierId: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;
    const { modifierId } = await params;

    const body = await request.json();
    const {
      name,
      type,
      priceAdjustment,
      cafePriceAdjustment,
      rappiPriceAdjustment,
      pedidosyaPriceAdjustment,
      uberPriceAdjustment,
      sortOrder,
      isActive,
    } = body;

    // Check if modifier exists and belongs to this tenant
    const existingModifier = await prisma.productModifier.findFirst({
      where: {
        id: modifierId,
        tenantId,
      },
    });

    if (!existingModifier) {
      return NextResponse.json(
        { error: 'Modifier not found' },
        { status: 404 }
      );
    }

    const modifier = await prisma.productModifier.update({
      where: {
        id: modifierId,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(priceAdjustment !== undefined && { priceAdjustment }),
        ...(cafePriceAdjustment !== undefined && { cafePriceAdjustment: cafePriceAdjustment ? parseFloat(cafePriceAdjustment) : null }),
        ...(rappiPriceAdjustment !== undefined && { rappiPriceAdjustment: rappiPriceAdjustment ? parseFloat(rappiPriceAdjustment) : null }),
        ...(pedidosyaPriceAdjustment !== undefined && { pedidosyaPriceAdjustment: pedidosyaPriceAdjustment ? parseFloat(pedidosyaPriceAdjustment) : null }),
        ...(uberPriceAdjustment !== undefined && { uberPriceAdjustment: uberPriceAdjustment ? parseFloat(uberPriceAdjustment) : null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      data: modifier,
    });
  } catch (error: any) {
    console.error('Error updating modifier:', error);
    return NextResponse.json(
      { error: 'Failed to update modifier', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/modifiers/[modifierId]
 * Delete a modifier
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ modifierId: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;
    const { modifierId } = await params;

    // Check if modifier exists and belongs to this tenant
    const existingModifier = await prisma.productModifier.findFirst({
      where: {
        id: modifierId,
        tenantId,
      },
    });

    if (!existingModifier) {
      return NextResponse.json(
        { error: 'Modifier not found' },
        { status: 404 }
      );
    }

    await prisma.productModifier.delete({
      where: {
        id: modifierId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Modifier deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting modifier:', error);
    return NextResponse.json(
      { error: 'Failed to delete modifier', details: error.message },
      { status: 500 }
    );
  }
}
