/**
 * Products API Routes
 * GET /api/products - List products with pagination, search, and filtering
 * POST /api/products - Create new product
 */

import { NextRequest, NextResponse } from 'next/server';
import { productService } from './product.service';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { validateApiKey } from '@/lib/auth';

interface ProductParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sortBy?: 'name' | 'sku' | 'price' | 'stock' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  includeInactive?: boolean;
}

/**
 * GET /api/products
 * List products with pagination and filtering
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

    const params: ProductParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100), // Max 100 items per page
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      sortBy: (searchParams.get('sortBy') as ProductParams['sortBy']) || 'name',
      sortOrder: (searchParams.get('sortOrder') as ProductParams['sortOrder']) || 'asc',
      includeInactive: searchParams.get('includeInactive') === 'true',
    };

    const offset = (params.page! - 1) * params.limit!;

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      tenantId,
      ...(params.includeInactive ? {} : { isActive: true }),
    };

    // Add search filter
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { sku: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { brand: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Add category filter
    if (params.category) {
      where.category = { equals: params.category, mode: 'insensitive' };
    }

    // Build order by clause
    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    switch (params.sortBy) {
      case 'name':
        orderBy.name = params.sortOrder;
        break;
      case 'sku':
        orderBy.sku = params.sortOrder;
        break;
      case 'price':
        orderBy.unitPrice = params.sortOrder;
        break;
      case 'stock':
        orderBy.currentStock = params.sortOrder;
        break;
      case 'createdAt':
        orderBy.createdAt = params.sortOrder;
        break;
      default:
        orderBy.name = 'asc';
    }

    // Execute queries
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: offset,
        take: params.limit,
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
      }),
      prisma.product.count({ where }),
    ]);

    // Transform data for response
    const transformedProducts = products.map(product => ({
      id: product.id,
      sku: product.sku,
      ean: product.ean,
      name: product.name,
      description: product.description,
      type: product.type,
      category: product.category,
      brand: product.brand,
      unitPrice: Number(product.unitPrice),
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
      retailPrice: product.retailPrice ? Number(product.retailPrice) : null,
      menuSection: product.menuSection,
      hoy: product.hoy,
      currentStock: product.currentStock,
      minStock: product.minStock,
      maxStock: product.maxStock,
      unit: product.unit,
      hasRecipe: product.hasRecipe,
      isActive: product.isActive,
      cafePrice: product.cafePrice ? Number(product.cafePrice) : null,
      rappiPrice: product.rappiPrice ? Number(product.rappiPrice) : null,
      pedidosyaPrice: product.pedidosyaPrice ? Number(product.pedidosyaPrice) : null,
      uberPrice: product.uberPrice ? Number(product.uberPrice) : null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      suppliers: product.suppliers.map(ps => ({
        id: ps.supplier.id,
        name: ps.supplier.name,
        code: ps.supplier.code,
        supplierPrice: Number(ps.supplierPrice),
        isPreferred: ps.isPreferred,
      })),
      staffOwners: product.staffOwners.map(so => ({
        id: so.staff.id,
        name: `${so.staff.firstName} ${so.staff.lastName}`,
        email: so.staff.email,
        relationship: so.relationship,
      })),
    }));

    const totalPages = Math.ceil(totalCount / params.limit!);
    const hasNextPage = params.page! < totalPages;
    const hasPrevPage = params.page! > 1;

    return NextResponse.json({
      data: transformedProducts,
      pagination: {
        page: params.page,
        limit: params.limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        search: params.search,
        category: params.category,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        includeInactive: params.includeInactive,
      },
    });

  } catch (error) {
    console.error('Error fetching products:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Create new product
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

    // Validate required fields
    const requiredFields = ['sku', 'name', 'unitPrice'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: missingFields.map(field => `${field} is required`)
        },
        { status: 400 }
      );
    }

    // Validate data types
    if (typeof body.unitPrice !== 'number' || body.unitPrice <= 0) {
      return NextResponse.json(
        { error: 'Unit price must be a positive number' },
        { status: 400 }
      );
    }

    if (body.costPrice && (typeof body.costPrice !== 'number' || body.costPrice < 0)) {
      return NextResponse.json(
        { error: 'Cost price must be a non-negative number' },
        { status: 400 }
      );
    }

    if (body.currentStock && (typeof body.currentStock !== 'number' || body.currentStock < 0)) {
      return NextResponse.json(
        { error: 'Current stock must be a non-negative number' },
        { status: 400 }
      );
    }

    // Check if SKU already exists for this tenant
    const existingProduct = await prisma.product.findUnique({
      where: {
        tenantId_sku: {
          tenantId,
          sku: body.sku,
        },
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this SKU already exists' },
        { status: 409 }
      );
    }

    // Create the product
    const newProduct = await prisma.product.create({
      data: {
        tenantId,
        sku: body.sku,
        name: body.name,
        description: body.description || null,
        category: body.category || null,
        brand: body.brand || null,
        unitPrice: new Prisma.Decimal(body.unitPrice),
        costPrice: body.costPrice ? new Prisma.Decimal(body.costPrice) : null,
        currentStock: body.currentStock || 0,
        minStock: body.minStock || 0,
        maxStock: body.maxStock || null,
        unit: body.unit || 'UNIT',
        isActive: body.isActive !== undefined ? body.isActive : true,
        metadata: body.metadata || {},
      },
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
      id: newProduct.id,
      sku: newProduct.sku,
      name: newProduct.name,
      description: newProduct.description,
      category: newProduct.category,
      brand: newProduct.brand,
      unitPrice: Number(newProduct.unitPrice),
      costPrice: newProduct.costPrice ? Number(newProduct.costPrice) : null,
      currentStock: newProduct.currentStock,
      minStock: newProduct.minStock,
      maxStock: newProduct.maxStock,
      unit: newProduct.unit,
      isActive: newProduct.isActive,
      createdAt: newProduct.createdAt,
      updatedAt: newProduct.updatedAt,
      suppliers: [],
      staffOwners: [],
    };

    return NextResponse.json(
      {
        message: 'Product created successfully',
        data: transformedProduct
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating product:', error);

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
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}