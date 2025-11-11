/**
 * Category Detail API
 * GET /api/categories/[id] - Get single category
 * PUT /api/categories/[id] - Update category
 * DELETE /api/categories/[id] - Delete category
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/categories/[id]
 * Get a single category with product count
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

    const { id } = await params;

    const category = await prisma.category.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Get product count
    const productCount = await prisma.product.count({
      where: {
        tenantId,
        category: category.name,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...category,
        productCount,
      },
    });

  } catch (error: any) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/categories/[id]
 * Update a category (and optionally rename it in all products)
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

    const { id } = await params;

    const body = await request.json();
    const { name, description, emoji, color, isActive } = body;

    // Find existing category
    const existing = await prisma.category.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // If name is changing, check for duplicates
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.category.findFirst({
        where: {
          name: name.trim(),
          tenantId,
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A category with this name already exists' },
          { status: 409 }
        );
      }

      // Update category name in all products
      await prisma.product.updateMany({
        where: {
          tenantId,
          category: existing.name,
        },
        data: {
          category: name.trim(),
        },
      });
    }

    // Update category
    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(emoji && { emoji }),
        ...(color && { color }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Get product count
    const productCount = await prisma.product.count({
      where: {
        tenantId,
        category: updated.name,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        productCount,
      },
    });

  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories/[id]
 * Delete a category (removes category from all products)
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

    const { id } = await params;

    // Find category
    const category = await prisma.category.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Remove category from all products
    await prisma.product.updateMany({
      where: {
        tenantId,
        category: category.name,
      },
      data: {
        category: null,
      },
    });

    // Delete category
    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
    });

  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category', details: error.message },
      { status: 500 }
    );
  }
}
