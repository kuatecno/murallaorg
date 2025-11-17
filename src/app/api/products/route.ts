/**
 * Products API Routes
 * GET /api/products - List products with pagination, search, and filtering
 * POST /api/products - Create new product
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getCorsHeaders, corsResponse, corsError } from '@/lib/cors';

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
 * OPTIONS /api/products
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
 * GET /api/products
 * List products with pagination and filtering
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
          variants: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              name: true,
              displayName: true,
              useCustomName: true,
              description: true,
              sku: true,
              price: true,
              costPrice: true,
              cafePrice: true,
              rappiPrice: true,
              pedidosyaPrice: true,
              uberPrice: true,
              minStock: true,
              maxStock: true,
              images: true,
              isDefault: true,
              sortOrder: true,
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
      shortDescription: product.shortDescription,
      type: product.type,
      category: product.category,
      brand: product.brand,
      sourceUrl: product.sourceUrl,
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
      format: product.format,
      tags: product.tags,
      images: product.images,
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
      variants: product.variants?.map(variant => ({
        id: variant.id,
        name: variant.name,
        displayName: variant.displayName,
        sku: variant.sku,
        price: variant.price ? Number(variant.price) : null,
        isDefault: variant.isDefault,
      })) || [],
    }));

    const totalPages = Math.ceil(totalCount / params.limit!);
    const hasNextPage = params.page! < totalPages;
    const hasPrevPage = params.page! > 1;

    return corsResponse({
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
    }, 200, origin);

  } catch (error) {
    console.error('Error fetching products:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return corsError('Database error: ' + error.message, 400, origin);
    }

    return corsError('Failed to fetch products', 500, origin);
  }
}

/**
 * POST /api/products
 * Create new product
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

    // Validate required fields
    const requiredFields = ['sku', 'name'];
    const missingFields = requiredFields.filter(field => body[field] === undefined || body[field] === null || (typeof body[field] === 'string' && body[field].trim() === ''));

    if (missingFields.length > 0) {
      return corsError(
        'Missing required fields: ' + missingFields.join(', '),
        400,
        origin
      );
    }

    const unitPriceValue = typeof body.unitPrice === 'number' && !Number.isNaN(body.unitPrice)
      ? body.unitPrice
      : (typeof body.unitPrice === 'string' && body.unitPrice.trim() !== '' && !Number.isNaN(Number(body.unitPrice)))
        ? Number(body.unitPrice)
        : 0;

    const costPriceValue = body.costPrice !== undefined && body.costPrice !== null && body.costPrice !== ''
      ? Number(body.costPrice)
      : undefined;

    const currentStockValue = body.currentStock !== undefined && body.currentStock !== null && body.currentStock !== ''
      ? Number(body.currentStock)
      : undefined;

    const minStockValue = body.minStock !== undefined && body.minStock !== null && body.minStock !== ''
      ? Number(body.minStock)
      : undefined;

    const maxStockValue = body.maxStock !== undefined && body.maxStock !== null && body.maxStock !== ''
      ? Number(body.maxStock)
      : undefined;

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
      return corsError('Product with this SKU already exists', 409, origin);
    }

    // Create the product
    const newProduct = await prisma.product.create({
      data: {
        tenantId,
        sku: body.sku,
        name: body.name,
        description: body.description || null,
        shortDescription: body.shortDescription || null,
        type: body.type || 'INPUT',
        category: body.category || null,
        brand: body.brand || null,
        sourceUrl: body.sourceUrl || null,
        unitPrice: new Prisma.Decimal(unitPriceValue || 0),
        costPrice: costPriceValue !== undefined && !Number.isNaN(costPriceValue) ? new Prisma.Decimal(costPriceValue) : null,
        currentStock: currentStockValue !== undefined && !Number.isNaN(currentStockValue) ? currentStockValue : 0,
        minStock: minStockValue !== undefined && !Number.isNaN(minStockValue) ? minStockValue : 0,
        maxStock: maxStockValue !== undefined && !Number.isNaN(maxStockValue) ? maxStockValue : null,
        unit: body.unit || 'UNIT',
        format: body.format || null,
        // Only include tags if the field exists in the schema
        ...(body.tags && { tags: body.tags }),
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
      shortDescription: newProduct.shortDescription,
      type: newProduct.type,
      category: newProduct.category,
      brand: newProduct.brand,
      unitPrice: Number(newProduct.unitPrice),
      costPrice: newProduct.costPrice ? Number(newProduct.costPrice) : null,
      currentStock: newProduct.currentStock,
      minStock: newProduct.minStock,
      maxStock: newProduct.maxStock,
      unit: newProduct.unit,
      images: newProduct.images,
      isActive: newProduct.isActive,
      createdAt: newProduct.createdAt,
      updatedAt: newProduct.updatedAt,
      suppliers: [],
      staffOwners: [],
    };

    return corsResponse(
      {
        message: 'Product created successfully',
        data: transformedProduct
      },
      201,
      origin
    );

  } catch (error) {
    console.error('Error creating product:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return corsError('Product with this SKU already exists', 409, origin);
      }

      return corsError('Database error: ' + error.message, 400, origin);
    }

    return corsError('Failed to create product', 500, origin);
  }
}