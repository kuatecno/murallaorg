import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/inventory/movements - Get inventory movements
 * Query parameters:
 * - productId: Filter by product ID
 * - type: Filter by movement type
 * - limit: Number of records to return (default: 50)
 * - offset: Number of records to skip (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }

    const { tenantId, userId } = authResult;
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {
      tenantId: tenantId,
    };

    if (productId) {
      where.productId = productId;
    }

    if (type) {
      where.type = type;
    }

    // Get movements with related data
    const movements = await prisma.productMovement.findMany({
      where,
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
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        deliveredBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await prisma.productMovement.count({ where });

    return NextResponse.json({
      success: true,
      data: movements,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });

  } catch (error: any) {
    console.error('Error fetching inventory movements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory movements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/movements - Create inventory movement
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
    const {
      type,
      productId,
      quantity,
      fromLocation,
      toLocation,
      supplierId,
      cost,
      notes,
      referenceType,
      referenceId,
    } = body;

    // Validate required fields
    if (!type || !productId || !quantity) {
      return NextResponse.json(
        { error: 'Type, product ID, and quantity are required' },
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

    // Start transaction to create movement and update inventory
    const result = await prisma.$transaction(async (tx) => {
      // Create movement record
      const movement = await tx.productMovement.create({
        data: {
          type,
          productId,
          quantity: parseInt(quantity),
          fromLocation,
          toLocation,
          supplierId,
          receivedById: userId,
          cost: cost ? parseFloat(cost) : null,
          notes,
          referenceType,
          referenceId,
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

      // Update product current stock based on movement type
      let stockChange = 0;
      switch (type) {
        case 'PURCHASE':
        case 'PRODUCTION_OUTPUT':
        case 'RETURN':
        case 'ADJUSTMENT':
          stockChange = parseInt(quantity);
          break;
        case 'SALE':
        case 'PRODUCTION_INPUT':
        case 'SALE_CONSUMPTION':
        case 'DAMAGE':
          stockChange = -parseInt(quantity);
          break;
        case 'TRANSFER':
          // For transfers, we might need more complex logic
          // For now, assume it's neutral to total stock
          stockChange = 0;
          break;
      }

      // Update product stock
      if (stockChange !== 0) {
        await tx.product.update({
          where: { id: productId },
          data: {
            currentStock: {
              increment: stockChange,
            },
          },
        });
      }

      // Update inventory records if locations are specified
      if (toLocation && ['PURCHASE', 'PRODUCTION_OUTPUT', 'RETURN'].includes(type)) {
        // Add to destination location
        await tx.inventoryRecord.upsert({
          where: {
            productId_location_tenantId: {
              productId,
              location: toLocation,
              tenantId: tenantId,
            },
          },
          update: {
            quantity: { increment: parseInt(quantity) },
            availableQty: { increment: parseInt(quantity) },
            updatedAt: new Date(),
          },
          create: {
            productId,
            location: toLocation,
            quantity: parseInt(quantity),
            reservedQty: 0,
            availableQty: parseInt(quantity),
            tenantId: tenantId,
          },
        });
      }

      if (fromLocation && ['SALE', 'PRODUCTION_INPUT', 'DAMAGE'].includes(type)) {
        // Remove from source location
        await tx.inventoryRecord.upsert({
          where: {
            productId_location_tenantId: {
              productId,
              location: fromLocation,
              tenantId: tenantId,
            },
          },
          update: {
            quantity: { decrement: parseInt(quantity) },
            availableQty: { decrement: parseInt(quantity) },
            updatedAt: new Date(),
          },
          create: {
            productId,
            location: fromLocation,
            quantity: -parseInt(quantity),
            reservedQty: 0,
            availableQty: -parseInt(quantity),
            tenantId: tenantId,
          },
        });
      }

      return movement;
    });

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error: any) {
    console.error('Error creating inventory movement:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory movement' },
      { status: 500 }
    );
  }
}
