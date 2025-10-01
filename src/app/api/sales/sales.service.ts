import { PrismaClient, Transaction, TransactionItem, ProductType } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateSaleDto {
  customerId?: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }[];
  paymentMethod?: string;
  notes?: string;
  tenantId: string;
  createdById?: string;
}

export class SalesService {
  /**
   * Process a sale transaction
   * Handles different product types:
   * - PURCHASED: Simple stock deduction
   * - MANUFACTURED: Stock deduction (already produced)
   * - MADE_TO_ORDER: Auto-deduct ingredients
   */
  async processSale(data: CreateSaleDto): Promise<Transaction> {
    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice - (item.discount || 0);
    }, 0);

    const tax = subtotal * 0.19; // 19% IVA in Chile
    const total = subtotal + tax;

    return await prisma.$transaction(async (tx) => {
      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          type: 'SALE',
          status: 'COMPLETED',
          customerId: data.customerId,
          subtotal,
          tax,
          discount: data.items.reduce((sum, item) => sum + (item.discount || 0), 0),
          total,
          paymentMethod: data.paymentMethod as any,
          paymentStatus: 'PAID',
          notes: data.notes,
          tenantId: data.tenantId,
          createdById: data.createdById,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              totalPrice: item.quantity * item.unitPrice - (item.discount || 0),
            })),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      // Process each item based on product type
      for (const item of transaction.items) {
        if (!item.product) continue;

        await this.processItemByType(tx, item, transaction.id, data.tenantId);
      }

      return transaction;
    });
  }

  /**
   * Process item based on product type
   */
  private async processItemByType(
    tx: any,
    item: TransactionItem & { product: any },
    transactionId: string,
    tenantId: string
  ) {
    const product = item.product;

    switch (product.type as ProductType) {
      case 'PURCHASED':
        await this.processPurchasedProduct(tx, item, transactionId, tenantId);
        break;

      case 'MANUFACTURED':
        await this.processManufacturedProduct(tx, item, transactionId, tenantId);
        break;

      case 'MADE_TO_ORDER':
        await this.processMadeToOrderProduct(tx, item, transactionId, tenantId);
        break;

      case 'SERVICE':
        // No inventory impact for services
        break;
    }
  }

  /**
   * Process PURCHASED product sale
   */
  private async processPurchasedProduct(
    tx: any,
    item: TransactionItem & { product: any },
    transactionId: string,
    tenantId: string
  ) {
    const product = item.product;

    // Check stock availability
    if (product.currentStock < item.quantity) {
      throw new Error(
        `Insufficient stock for ${product.name}. Available: ${product.currentStock}, Required: ${item.quantity}`
      );
    }

    // Deduct from stock
    await tx.product.update({
      where: { id: product.id },
      data: {
        currentStock: { decrement: item.quantity },
      },
    });

    // Record movement
    await tx.productMovement.create({
      data: {
        type: 'SALE',
        productId: product.id,
        quantity: -item.quantity,
        referenceType: 'TRANSACTION',
        referenceId: transactionId,
        cost: (product.costPrice?.toNumber() || 0) * item.quantity,
        notes: `Sale transaction ${transactionId}`,
        tenantId,
      },
    });
  }

  /**
   * Process MANUFACTURED product sale
   */
  private async processManufacturedProduct(
    tx: any,
    item: TransactionItem & { product: any },
    transactionId: string,
    tenantId: string
  ) {
    const product = item.product;

    // Check stock availability
    if (product.currentStock < item.quantity) {
      throw new Error(
        `Insufficient stock for ${product.name}. Available: ${product.currentStock}, Required: ${item.quantity}`
      );
    }

    // Deduct from stock
    await tx.product.update({
      where: { id: product.id },
      data: {
        currentStock: { decrement: item.quantity },
      },
    });

    // Record movement
    await tx.productMovement.create({
      data: {
        type: 'SALE',
        productId: product.id,
        quantity: -item.quantity,
        referenceType: 'TRANSACTION',
        referenceId: transactionId,
        cost: (product.costPrice?.toNumber() || 0) * item.quantity,
        notes: `Sale transaction ${transactionId}`,
        tenantId,
      },
    });
  }

  /**
   * Process MADE_TO_ORDER product sale (auto-deduct ingredients)
   */
  private async processMadeToOrderProduct(
    tx: any,
    item: TransactionItem & { product: any },
    transactionId: string,
    tenantId: string
  ) {
    const product = item.product;

    // Get default recipe
    const recipe = await tx.recipe.findFirst({
      where: {
        productId: product.id,
        isActive: true,
        isDefault: true,
      },
      include: {
        ingredients: {
          include: { ingredient: true },
        },
      },
    });

    if (!recipe) {
      throw new Error(`No recipe found for MADE_TO_ORDER product: ${product.name}`);
    }

    // Check ingredient availability
    for (const ing of recipe.ingredients) {
      if (ing.isOptional) continue;

      const qtyNeeded = ing.quantity.toNumber() * item.quantity;
      const available = ing.ingredient.currentStock;

      if (available < qtyNeeded) {
        throw new Error(
          `Insufficient ingredient ${ing.ingredient.name} for ${product.name}. ` +
            `Available: ${available}, Required: ${qtyNeeded}`
        );
      }
    }

    // Deduct ingredients
    for (const ing of recipe.ingredients) {
      const qtyNeeded = ing.quantity.toNumber() * item.quantity;
      const cost = (ing.ingredient.costPrice?.toNumber() || 0) * qtyNeeded;

      // Deduct from stock
      await tx.product.update({
        where: { id: ing.ingredientId },
        data: {
          currentStock: { decrement: Math.floor(qtyNeeded) },
        },
      });

      // Record consumption
      await tx.ingredientConsumption.create({
        data: {
          transactionId,
          productId: product.id,
          recipeId: recipe.id,
          ingredientId: ing.ingredientId,
          quantityUsed: qtyNeeded,
          unit: ing.unit,
          cost,
          tenantId,
        },
      });

      // Record movement
      await tx.productMovement.create({
        data: {
          type: 'SALE_CONSUMPTION',
          productId: ing.ingredientId,
          quantity: -Math.floor(qtyNeeded),
          referenceType: 'TRANSACTION',
          referenceId: transactionId,
          cost,
          notes: `Auto-deducted for MADE_TO_ORDER product: ${product.name}`,
          tenantId,
        },
      });
    }
  }

  /**
   * Get sale by ID
   */
  async getSale(transactionId: string, tenantId: string) {
    return await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        tenantId,
        type: 'SALE',
      },
      include: {
        items: {
          include: { product: true },
        },
        customer: true,
        createdBy: true,
        ingredientConsumptions: {
          include: {
            ingredient: true,
          },
        },
      },
    });
  }

  /**
   * List sales with filters
   */
  async listSales(
    tenantId: string,
    filters: {
      customerId?: string;
      startDate?: Date;
      endDate?: Date;
      status?: string;
    } = {}
  ) {
    return await prisma.transaction.findMany({
      where: {
        tenantId,
        type: 'SALE',
        customerId: filters.customerId,
        status: filters.status as any,
        createdAt: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      include: {
        items: {
          include: { product: true },
        },
        customer: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get sales statistics
   */
  async getSalesStats(tenantId: string, startDate?: Date, endDate?: Date) {
    const sales = await prisma.transaction.findMany({
      where: {
        tenantId,
        type: 'SALE',
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    const stats = {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, s) => sum + s.total.toNumber(), 0),
      totalItems: sales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0), 0),
      averageOrderValue:
        sales.reduce((sum, s) => sum + s.total.toNumber(), 0) / (sales.length || 1),
      byProductType: {} as Record<
        string,
        {
          sales: number;
          quantity: number;
          revenue: number;
        }
      >,
      topProducts: [] as Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
      }>,
    };

    // Group by product type
    const productMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
      }
    >();

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const type = item.product?.type || 'UNKNOWN';

        if (!stats.byProductType[type]) {
          stats.byProductType[type] = {
            sales: 0,
            quantity: 0,
            revenue: 0,
          };
        }

        stats.byProductType[type].sales++;
        stats.byProductType[type].quantity += item.quantity;
        stats.byProductType[type].revenue += item.totalPrice.toNumber();

        // Track individual products
        if (item.productId) {
          const existing = productMap.get(item.productId);
          if (existing) {
            existing.quantitySold += item.quantity;
            existing.revenue += item.totalPrice.toNumber();
          } else {
            productMap.set(item.productId, {
              productId: item.productId,
              productName: item.productName,
              quantitySold: item.quantity,
              revenue: item.totalPrice.toNumber(),
            });
          }
        }
      });
    });

    // Get top 10 products
    stats.topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return stats;
  }

  /**
   * Check if product can be sold (stock/ingredients available)
   */
  async checkAvailability(productId: string, quantity: number, tenantId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId },
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
    });

    if (!product) {
      return { available: false, reason: 'Product not found' };
    }

    switch (product.type) {
      case 'PURCHASED':
      case 'MANUFACTURED':
        if (product.currentStock < quantity) {
          return {
            available: false,
            reason: `Insufficient stock. Available: ${product.currentStock}, Required: ${quantity}`,
          };
        }
        return { available: true };

      case 'MADE_TO_ORDER':
        const recipe = product.recipesAsProduct[0];
        if (!recipe) {
          return { available: false, reason: 'No recipe configured' };
        }

        for (const ing of recipe.ingredients) {
          if (ing.isOptional) continue;

          const required = ing.quantity.toNumber() * quantity;
          if (ing.ingredient.currentStock < required) {
            return {
              available: false,
              reason: `Insufficient ingredient: ${ing.ingredient.name}. Available: ${ing.ingredient.currentStock}, Required: ${required}`,
            };
          }
        }

        return { available: true };

      case 'SERVICE':
        return { available: true };

      default:
        return { available: false, reason: 'Unknown product type' };
    }
  }
}

export const salesService = new SalesService();
