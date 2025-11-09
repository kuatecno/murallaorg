/**
 * Categories API
 * GET /api/categories - List all categories with product counts
 * POST /api/categories - Create new category
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getCorsHeaders, corsResponse, corsError } from '@/lib/cors';

/**
 * OPTIONS /api/categories
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

/**
 * GET /api/categories
 * List all categories with computed product counts
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    // Authenticate user (JWT cookie or API key)
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;

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

    return corsResponse({
      success: true,
      data: categoriesWithCounts,
    }, 200, origin);

  } catch (error: any) {
    console.error('Error fetching categories:', error);
    console.error('Error stack:', error.stack);
    
    // If it's a database schema error, provide more specific error info
    if (error.code === 'P2021' || error.message.includes('does not exist')) {
      console.error('Database schema error - table or column may not exist');
      return corsError('Database schema error - please check if migrations have been applied', 500, origin);
    }
    
    return corsError('Failed to fetch categories: ' + error.message, 500, origin);
  }
}

/**
 * POST /api/categories
 * Create a new category
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    // Authenticate user (JWT cookie or API key)
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;

    const body = await request.json();
    const { name, description, emoji, color } = body;

    if (!name || !name.trim()) {
      return corsError('Category name is required', 400, origin);
    }

    // Check if category already exists
    const existing = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        tenantId,
      },
    });

    if (existing) {
      return corsError('A category with this name already exists', 409, origin);
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

    return corsResponse({
      success: true,
      data: {
        ...category,
        productCount: 0,
      },
    }, 201, origin);

  } catch (error: any) {
    console.error('Error creating category:', error);
    return corsError('Failed to create category: ' + error.message, 500, origin);
  }
}
