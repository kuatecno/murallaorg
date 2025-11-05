/**
 * Categories API
 * GET /api/categories - List all categories with product counts
 * POST /api/categories - Create new category
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateApiKey } from '@/lib/auth';

/**
 * GET /api/categories
 * List all categories with computed product counts
 */
export async function GET(request: NextRequest) {
  try {
    // Validate API key and get tenant ID
    const auth = await validateApiKey(request);
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }
    const tenantId = auth.tenantId!;

    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || undefined;
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';

    // Build where clause
    const where: any = {
      tenantId,
      ...(includeInactive ? {} : { isActive: true }),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch categories
    const categories = await prisma.category.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
    });

    // Compute product counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const productCount = await prisma.product.count({
          where: {
            tenantId,
            category: category.name,
            isActive: true,
          },
        });

        return {
          id: category.id,
          name: category.name,
          description: category.description,
          emoji: category.emoji,
          color: category.color,
          isActive: category.isActive,
          productCount,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: categoriesWithCounts,
    });

  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * Create a new category
 */
export async function POST(request: NextRequest) {
  try {
    // Validate API key and get tenant ID
    const auth = await validateApiKey(request);
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }
    const tenantId = auth.tenantId!;

    const body = await request.json();
    const { name, description, emoji, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if category already exists
    const existing = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        tenantId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 }
      );
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        emoji: emoji || '📦',
        color: color || '#3B82F6',
        tenantId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...category,
        productCount: 0,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category', details: error.message },
      { status: 500 }
    );
  }
}
