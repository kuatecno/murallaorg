/**
 * Individual Product API Routes
 * GET /api/products/[id] - Get single product
 * PUT /api/products/[id] - Update product
 * DELETE /api/products/[id] - Soft delete product
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/products/[id]
 * Get single product by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication (JWT or API key)
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;

    const { id: productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
      },
      include: {
        suppliers: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                code: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        staffOwners: {
          include: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Last 10 movements
          include: {
            receivedBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            deliveredBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            supplier: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
        inventoryRecords: {
          select: {
            location: true,
            quantity: true,
            reservedQty: true,
            availableQty: true,
            lastCountDate: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Transform data for response
    const transformedProduct = {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      brand: product.brand,
      unitPrice: Number(product.unitPrice),
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      currentStock: product.currentStock,
      minStock: product.minStock,
      maxStock: product.maxStock,
      unit: product.unit,
      isActive: product.isActive,
      metadata: product.metadata,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      suppliers: product.suppliers.map(ps => ({
        id: ps.supplier.id,
        name: ps.supplier.name,
        code: ps.supplier.code,
        email: ps.supplier.email,
        phone: ps.supplier.phone,
        supplierSKU: ps.supplierSKU,
        supplierPrice: Number(ps.supplierPrice),
        leadTimeDays: ps.leadTimeDays,
        minOrderQty: ps.minOrderQty,
        isPreferred: ps.isPreferred,
        isActive: ps.isActive,
        lastPurchase: ps.lastPurchase,
        notes: ps.notes,
      })),
      staffOwners: product.staffOwners.map(so => ({
        id: so.staff.id,
        name: `${so.staff.firstName} ${so.staff.lastName}`,
        email: so.staff.email,
        role: so.staff.role,
        relationship: so.relationship,
        permissions: so.permissions,
        startDate: so.startDate,
        endDate: so.endDate,
        notes: so.notes,
      })),
      recentMovements: product.movements.map(movement => ({
        id: movement.id,
        type: movement.type,
        quantity: movement.quantity,
        fromLocation: movement.fromLocation,
        toLocation: movement.toLocation,
        cost: movement.cost ? Number(movement.cost) : null,
        referenceType: movement.referenceType,
        referenceId: movement.referenceId,
        notes: movement.notes,
        createdAt: movement.createdAt,
        receivedBy: movement.receivedBy ?
          `${movement.receivedBy.firstName} ${movement.receivedBy.lastName}` : null,
        deliveredBy: movement.deliveredBy ?
          `${movement.deliveredBy.firstName} ${movement.deliveredBy.lastName}` : null,
        supplier: movement.supplier ? {
          name: movement.supplier.name,
          code: movement.supplier.code,
        } : null,
      })),
      inventory: product.inventoryRecords.map(inv => ({
        location: inv.location,
        quantity: inv.quantity,
        reservedQty: inv.reservedQty,
        availableQty: inv.availableQty,
        lastCountDate: inv.lastCountDate,
      })),
    };

    return NextResponse.json({ data: transformedProduct });

  } catch (error) {
    console.error('Error fetching product:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products/[id]
 * Update product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication (JWT or API key)
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;

    const { id: productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Check if product exists and belongs to tenant
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Validate data types if provided
    if (body.unitPrice !== undefined) {
      if (typeof body.unitPrice !== 'number' || body.unitPrice <= 0) {
        return NextResponse.json(
          { error: 'Unit price must be a positive number' },
          { status: 400 }
        );
      }
    }

    if (body.costPrice !== undefined && body.costPrice !== null) {
      if (typeof body.costPrice !== 'number' || body.costPrice < 0) {
        return NextResponse.json(
          { error: 'Cost price must be a non-negative number' },
          { status: 400 }
        );
      }
    }

    if (body.currentStock !== undefined) {
      if (typeof body.currentStock !== 'number' || body.currentStock < 0) {
        return NextResponse.json(
          { error: 'Current stock must be a non-negative number' },
          { status: 400 }
        );
      }
    }

    // Check if SKU change conflicts with existing products
    if (body.sku && body.sku !== existingProduct.sku) {
      const conflictingProduct = await prisma.product.findFirst({
        where: {
          tenantId,
          sku: body.sku,
          id: { not: productId },
        },
      });

      if (conflictingProduct) {
        return NextResponse.json(
          { error: 'Product with this SKU already exists' },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: Prisma.ProductUpdateInput = {};

    // Only update fields that are provided
    if (body.sku !== undefined) updateData.sku = body.sku;
    if (body.ean !== undefined) updateData.ean = body.ean;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.brand !== undefined) updateData.brand = body.brand;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.menuSection !== undefined) updateData.menuSection = body.menuSection;
    if (body.unitPrice !== undefined) updateData.unitPrice = new Prisma.Decimal(body.unitPrice);
    if (body.costPrice !== undefined) {
      updateData.costPrice = body.costPrice ? new Prisma.Decimal(body.costPrice) : null;
    }
    if (body.currentStock !== undefined) updateData.currentStock = body.currentStock;
    if (body.minStock !== undefined) updateData.minStock = body.minStock;
    if (body.maxStock !== undefined) updateData.maxStock = body.maxStock;
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.images !== undefined) updateData.images = body.images;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        suppliers: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        staffOwners: {
          include: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Transform response
    const transformedProduct = {
      id: updatedProduct.id,
      sku: updatedProduct.sku,
      name: updatedProduct.name,
      description: updatedProduct.description,
      category: updatedProduct.category,
      brand: updatedProduct.brand,
      unitPrice: Number(updatedProduct.unitPrice),
      costPrice: updatedProduct.costPrice ? Number(updatedProduct.costPrice) : null,
      currentStock: updatedProduct.currentStock,
      minStock: updatedProduct.minStock,
      maxStock: updatedProduct.maxStock,
      unit: updatedProduct.unit,
      isActive: updatedProduct.isActive,
      metadata: updatedProduct.metadata,
      createdAt: updatedProduct.createdAt,
      updatedAt: updatedProduct.updatedAt,
      suppliers: updatedProduct.suppliers.map(ps => ({
        id: ps.supplier.id,
        name: ps.supplier.name,
        code: ps.supplier.code,
        supplierPrice: Number(ps.supplierPrice),
        isPreferred: ps.isPreferred,
      })),
      staffOwners: updatedProduct.staffOwners.map(so => ({
        id: so.staff.id,
        name: `${so.staff.firstName} ${so.staff.lastName}`,
        email: so.staff.email,
        relationship: so.relationship,
      })),
    };

    return NextResponse.json({
      message: 'Product updated successfully',
      data: transformedProduct
    });

  } catch (error) {
    console.error('Error updating product:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Product with this SKU already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Soft delete product (set isActive to false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication (JWT or API key)
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;

    const { id: productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Check if product exists and belongs to tenant
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
        isActive: true, // Only allow deletion of active products
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found or already deleted' },
        { status: 404 }
      );
    }

    // Check if product has any active transactions or inventory movements
    const hasActiveTransactions = await prisma.transactionItem.findFirst({
      where: {
        productId: productId,
        transaction: {
          status: { in: ['PENDING', 'DRAFT'] },
        },
      },
    });

    if (hasActiveTransactions) {
      return NextResponse.json(
        {
          error: 'Cannot delete product with pending transactions',
          details: 'Product has active transactions that must be completed or cancelled first'
        },
        { status: 409 }
      );
    }

    // Soft delete the product
    const deletedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        sku: true,
        name: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: 'Product deleted successfully',
      data: {
        id: deletedProduct.id,
        sku: deletedProduct.sku,
        name: deletedProduct.name,
        isActive: deletedProduct.isActive,
        deletedAt: deletedProduct.updatedAt,
      }
    });

  } catch (error) {
    console.error('Error deleting product:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}