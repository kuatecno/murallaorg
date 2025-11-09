import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/inventory/adjust - Adjust inventory quantities
 * This endpoint allows for manual stock adjustments with proper tracking
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }

    const { tenantId, userId } = authResult;
    const body = await request.json();
    const { productId, newQuantity, location = 'MAIN', reason, notes } = body;

    // Validate required fields
    if (!productId || newQuantity === undefined) {
      return NextResponse.json(
        { error: 'Product ID and new quantity are required' },
        { status: 400 }
      );
    }

    // Verify product exists and belongs to tenant
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: tenantId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get current inventory record
    const currentInventory = await prisma.inventoryRecord.findUnique({
      where: {
        productId_location_tenantId: {
          productId,
          location,
          tenantId: tenantId,
        },
      },
    });

    const currentQuantity = currentInventory?.quantity || 0;
    const adjustment = parseInt(newQuantity) - currentQuantity;

    if (adjustment === 0) {
      return NextResponse.json(
        { error: 'No adjustment needed - quantities are the same' },
        { status: 400 }
      );
    }

    // Start transaction to create adjustment and update inventory
    const result = await prisma.$transaction(async (tx) => {
      // Create adjustment movement record
      const movement = await tx.productMovement.create({
        data: {
          type: 'ADJUSTMENT',
          productId,
          quantity: Math.abs(adjustment),
          toLocation: adjustment > 0 ? location : undefined,
          fromLocation: adjustment < 0 ? location : undefined,
          receivedById: userId,
          notes: `${reason ? reason + ': ' : ''}${notes || 'Manual inventory adjustment'}`,
          referenceType: 'MANUAL_ADJUSTMENT',
          metadata: {
            previousQuantity: currentQuantity,
            newQuantity: parseInt(newQuantity),
            adjustmentAmount: adjustment,
            reason,
          },
          tenantId: tenantId,
        },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              type: true,
              unit: true,
            },
          },
        },
      });

      // Update or create inventory record
      const updatedInventory = await tx.inventoryRecord.upsert({
        where: {
          productId_location_tenantId: {
            productId,
            location,
            tenantId: tenantId,
          },
        },
        update: {
          quantity: parseInt(newQuantity),
          availableQty: parseInt(newQuantity), // Assuming no reservations
          lastCountDate: new Date(),
          notes: `Adjusted by staff${notes ? ': ' + notes : ''}`,
          updatedAt: new Date(),
        },
        create: {
          productId,
          location,
          quantity: parseInt(newQuantity),
          reservedQty: 0,
          availableQty: parseInt(newQuantity),
          lastCountDate: new Date(),
          notes: `Initial count by staff${notes ? ': ' + notes : ''}`,
          tenantId: tenantId,
        },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              type: true,
              unit: true,
            },
          },
        },
      });

      // Update product current stock
      await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: {
            increment: adjustment,
          },
        },
      });

      return {
        movement,
        inventory: updatedInventory,
        adjustment: {
          previousQuantity: currentQuantity,
          newQuantity: parseInt(newQuantity),
          adjustmentAmount: adjustment,
        },
      };
    });

    return NextResponse.json({
      success: true,
      message: `Inventory adjusted by ${adjustment > 0 ? '+' : ''}${adjustment} units`,
      data: result,
    });

  } catch (error: any) {
    console.error('Error adjusting inventory:', error);
    return NextResponse.json(
      { error: 'Failed to adjust inventory' },
      { status: 500 }
    );
  }
}
