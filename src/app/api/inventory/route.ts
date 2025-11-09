import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/inventory - Get inventory records
 * Query parameters:
 * - productId: Filter by product ID
 * - location: Filter by location
 * - lowStock: Only show products with low stock (boolean)
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
    const location = searchParams.get('location');
    const lowStock = searchParams.get('lowStock') === 'true';

    // Build where clause
    const where: any = {
      tenantId: tenantId,
    };

    if (productId) {
      where.productId = productId;
    }

    if (location) {
      where.location = location;
    }

    // Get inventory records with product information
    const inventoryRecords = await prisma.inventoryRecord.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            type: true,
            unit: true,
            minStock: true,
            maxStock: true,
            currentStock: true,
          },
        },
      },
      orderBy: [
        { location: 'asc' },
        { product: { name: 'asc' } },
      ],
    });

    // Filter for low stock if requested
    let filteredRecords = inventoryRecords;
    if (lowStock) {
      filteredRecords = inventoryRecords.filter(record => 
        record.availableQty <= record.product.minStock
      );
    }

    return NextResponse.json({
      success: true,
      data: filteredRecords,
      count: filteredRecords.length,
    });

  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory records' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory - Create or update inventory record
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
    const { productId, location, quantity, notes } = body;

    // Validate required fields
    if (!productId || !location || quantity === undefined) {
      return NextResponse.json(
        { error: 'Product ID, location, and quantity are required' },
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

    // Create or update inventory record
    const inventoryRecord = await prisma.inventoryRecord.upsert({
      where: {
        productId_location_tenantId: {
          productId,
          location,
          tenantId: tenantId,
        },
      },
      update: {
        quantity: parseInt(quantity),
        availableQty: parseInt(quantity), // Assuming no reservations for now
        lastCountDate: new Date(),
        notes,
        updatedAt: new Date(),
      },
      create: {
        productId,
        location,
        quantity: parseInt(quantity),
        reservedQty: 0,
        availableQty: parseInt(quantity),
        lastCountDate: new Date(),
        notes,
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

    return NextResponse.json({
      success: true,
      data: inventoryRecord,
    });

  } catch (error: any) {
    console.error('Error creating/updating inventory:', error);
    return NextResponse.json(
      { error: 'Failed to create/update inventory record' },
      { status: 500 }
    );
  }
}
