/**
 * Product Variants API
 * GET /api/products/[id]/variants - List all variants for a product
 * POST /api/products/[id]/variants - Create a new variant
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateApiKey } from '@/lib/auth';

/**
 * GET /api/products/[id]/variants
 * List all variants for a product
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await validateApiKey(request);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const tenantId = auth.tenantId!;
    const productId = params.id;

    const variants = await prisma.productVariant.findMany({
      where: {
        productId,
        tenantId,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: variants,
    });
  } catch (error: any) {
    console.error('Error fetching variants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variants', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products/[id]/variants
 * Create a new variant for a product
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await validateApiKey(request);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const tenantId = auth.tenantId!;
    const productId = params.id;

    const body = await request.json();
    const { name, sku, priceAdjustment, sortOrder, isDefault } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Variant name is required' },
        { status: 400 }
      );
    }

    // If this variant is set as default, unset other defaults
    if (isDefault) {
      await prisma.productVariant.updateMany({
        where: {
          productId,
          tenantId,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        name,
        sku,
        priceAdjustment: priceAdjustment || 0,
        sortOrder: sortOrder || 0,
        isDefault: isDefault || false,
        tenantId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: variant,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating variant:', error);
    return NextResponse.json(
      { error: 'Failed to create variant', details: error.message },
      { status: 500 }
    );
  }
}
