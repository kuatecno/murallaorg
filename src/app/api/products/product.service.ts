import { PrismaClient, Product, ProductType } from '@prisma/client';
import { recipeService } from '../recipes/recipe.service';

const prisma = new PrismaClient();

export interface CreateProductDto {
  sku: string;
  name: string;
  description?: string;
  type: ProductType;
  category?: string;
  brand?: string;
  unitPrice: number;
  costPrice?: number;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  cafePrice?: number;
  rappiPrice?: number;
  pedidosyaPrice?: number;
  uberPrice?: number;
  tenantId: string;
}

export class ProductService {
  /**
   * Create a new product
   */
  async createProduct(data: CreateProductDto): Promise<Product> {
    const product = await prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description,
        type: data.type,
        category: data.category,
        brand: data.brand,
        unitPrice: data.unitPrice,
        costPrice: data.costPrice,
        minStock: data.minStock || 0,
        maxStock: data.maxStock,
        unit: data.unit || 'UNIT',
        cafePrice: data.cafePrice,
        rappiPrice: data.rappiPrice,
        pedidosyaPrice: data.pedidosyaPrice,
        uberPrice: data.uberPrice,
        hasRecipe: ['MANUFACTURED', 'MADE_TO_ORDER'].includes(data.type),
        tenantId: data.tenantId,
      },
    });

    // If has recipe, create default recipe
    if (product.hasRecipe) {
      await recipeService.createRecipe({
        productId: product.id,
        name: `${product.name} - Default Recipe`,
        isDefault: true,
        tenantId: data.tenantId,
      });
    }

    return product;
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string, tenantId: string) {
    return await prisma.product.findFirst({
      where: { id: productId, tenantId },
      include: {
        recipesAsProduct: {
          where: { isActive: true },
          include: {
            ingredients: {
              include: { ingredient: true },
            },
          },
        },
        suppliers: {
          include: { supplier: true },
        },
      },
    });
  }

  /**
   * List products by type
   */
  async getProductsByType(type: ProductType, tenantId: string) {
    return await prisma.product.findMany({
      where: {
        type,
        tenantId,
        isActive: true,
      },
      include: {
        recipesAsProduct: {
          where: { isActive: true, isDefault: true },
          include: {
            ingredients: {
              include: { ingredient: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get all purchased/ingredient products (for recipe ingredient selection)
   */
  async getIngredientsProducts(tenantId: string) {
    return await prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ type: 'PURCHASED' }, { type: 'MANUFACTURED' }],
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Update product
   */
  async updateProduct(productId: string, data: Partial<CreateProductDto>, tenantId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // If changing type to MANUFACTURED or MADE_TO_ORDER and doesn't have recipe
    const needsRecipe = ['MANUFACTURED', 'MADE_TO_ORDER'].includes(data.type!);
    const willNeedRecipe = needsRecipe && !product.hasRecipe;

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        ...data,
        hasRecipe: needsRecipe,
      },
    });

    // Create default recipe if needed
    if (willNeedRecipe) {
      await recipeService.createRecipe({
        productId: updated.id,
        name: `${updated.name} - Default Recipe`,
        isDefault: true,
        tenantId,
      });
    }

    return updated;
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: string, tenantId: string) {
    // Check if product is used in any recipes as ingredient
    const usedAsIngredient = await prisma.recipeIngredient.findFirst({
      where: { ingredientId: productId },
    });

    if (usedAsIngredient) {
      throw new Error(
        'Cannot delete product: it is used as an ingredient in one or more recipes'
      );
    }

    // Check if product has active stock
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (product && product.currentStock > 0) {
      throw new Error('Cannot delete product with active stock. Please adjust stock to zero first.');
    }

    // Soft delete (set isActive to false)
    return await prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    });
  }

  /**
   * List all products with filters
   */
  async listProducts(
    tenantId: string,
    filters: {
      type?: ProductType;
      category?: string;
      search?: string;
      isActive?: boolean;
    } = {}
  ) {
    return await prisma.product.findMany({
      where: {
        tenantId,
        type: filters.type,
        category: filters.category,
        isActive: filters.isActive !== undefined ? filters.isActive : true,
        OR: filters.search
          ? [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { sku: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        recipesAsProduct: {
          where: { isActive: true, isDefault: true },
          include: {
            ingredients: {
              include: { ingredient: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get products that need restocking
   */
  async getProductsNeedingRestock(tenantId: string) {
    return await prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        currentStock: {
          lte: prisma.product.fields.minStock, // Stock at or below minimum
        },
      },
      orderBy: { currentStock: 'asc' },
    });
  }

  /**
   * Adjust product stock
   */
  async adjustStock(
    productId: string,
    quantity: number,
    reason: string,
    tenantId: string,
    userId?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // Update stock
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: { increment: quantity },
        },
      });

      // Record movement
      await tx.productMovement.create({
        data: {
          type: 'ADJUSTMENT',
          productId,
          quantity,
          referenceType: 'MANUAL_ADJUSTMENT',
          notes: reason,
          tenantId,
        },
      });

      return product;
    });
  }

  /**
   * Get product stock history
   */
  async getStockHistory(productId: string, tenantId: string, limit: number = 50) {
    return await prisma.productMovement.findMany({
      where: {
        productId,
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        receivedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}

export const productService = new ProductService();
