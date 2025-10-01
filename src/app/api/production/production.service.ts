import { PrismaClient, ProductionBatch, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateBatchDto {
  recipeId: string;
  productId: string;
  plannedQuantity: number;
  notes?: string;
  tenantId: string;
  createdById?: string;
}

export class ProductionService {
  /**
   * Generate unique batch number
   */
  private async generateBatchNumber(tenantId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    // Get count of batches today
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const count = await prisma.productionBatch.count({
      where: {
        tenantId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    return `BATCH-${year}${month}${day}-${sequence}`;
  }

  /**
   * Check if enough ingredients are available
   */
  private async checkIngredientAvailability(
    recipeId: string,
    quantity: number
  ): Promise<{ success: boolean; missing: string[] }> {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          include: { ingredient: true },
        },
      },
    });

    if (!recipe) {
      throw new Error('Recipe not found');
    }

    const missing: string[] = [];

    for (const ing of recipe.ingredients) {
      if (ing.isOptional) continue;

      const required = ing.quantity.toNumber() * quantity;
      const available = ing.ingredient.currentStock;

      if (available < required) {
        missing.push(`${ing.ingredient.name} (need ${required}, have ${available})`);
      }
    }

    return {
      success: missing.length === 0,
      missing,
    };
  }

  /**
   * Create a production batch
   */
  async createBatch(data: CreateBatchDto): Promise<ProductionBatch> {
    const recipe = await prisma.recipe.findUnique({
      where: { id: data.recipeId },
      include: { ingredients: { include: { ingredient: true } } },
    });

    if (!recipe) {
      throw new Error('Recipe not found');
    }

    // Check if enough ingredients
    const canProduce = await this.checkIngredientAvailability(recipe.id, data.plannedQuantity);

    if (!canProduce.success) {
      throw new Error(`Insufficient ingredients: ${canProduce.missing.join(', ')}`);
    }

    const batchNumber = await this.generateBatchNumber(data.tenantId);

    const batch = await prisma.productionBatch.create({
      data: {
        batchNumber,
        recipeId: data.recipeId,
        productId: data.productId,
        plannedQuantity: data.plannedQuantity,
        status: 'PLANNED',
        notes: data.notes,
        tenantId: data.tenantId,
        createdById: data.createdById,
      },
      include: {
        recipe: {
          include: {
            product: true,
            ingredients: {
              include: { ingredient: true },
            },
          },
        },
      },
    });

    return batch;
  }

  /**
   * Start production (consume ingredients)
   */
  async startProduction(batchId: string, tenantId: string) {
    const batch = await prisma.productionBatch.findFirst({
      where: { id: batchId, tenantId },
      include: {
        recipe: {
          include: { ingredients: { include: { ingredient: true } } },
        },
      },
    });

    if (!batch) {
      throw new Error('Batch not found');
    }

    if (batch.status !== 'PLANNED') {
      throw new Error(`Cannot start batch with status ${batch.status}`);
    }

    return await prisma.$transaction(async (tx) => {
      let totalIngredientCost = 0;

      // Consume ingredients from stock
      for (const ing of batch.recipe.ingredients) {
        if (ing.isOptional) continue;

        const qtyNeeded = ing.quantity.toNumber() * batch.plannedQuantity;
        const cost = (ing.ingredient.costPrice?.toNumber() || 0) * qtyNeeded;
        totalIngredientCost += cost;

        // Deduct from stock
        await tx.product.update({
          where: { id: ing.ingredientId },
          data: {
            currentStock: { decrement: Math.floor(qtyNeeded) },
          },
        });

        // Record movement
        await tx.productMovement.create({
          data: {
            type: 'PRODUCTION_INPUT',
            productId: ing.ingredientId,
            quantity: -Math.floor(qtyNeeded),
            referenceType: 'PRODUCTION_BATCH',
            referenceId: batchId,
            cost,
            notes: `Consumed for batch ${batch.batchNumber}`,
            tenantId,
          },
        });
      }

      // Update batch status
      const updatedBatch = await tx.productionBatch.update({
        where: { id: batchId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          ingredientCost: totalIngredientCost,
        },
        include: {
          recipe: {
            include: {
              product: true,
              ingredients: { include: { ingredient: true } },
            },
          },
        },
      });

      return updatedBatch;
    });
  }

  /**
   * Complete production (add to stock)
   */
  async completeProduction(
    batchId: string,
    actualQuantity: number,
    laborCost?: number,
    overheadCost?: number,
    tenantId?: string
  ) {
    const batch = await prisma.productionBatch.findUnique({
      where: { id: batchId },
      include: { recipe: true },
    });

    if (!batch) {
      throw new Error('Batch not found');
    }

    if (batch.status !== 'IN_PROGRESS') {
      throw new Error(`Cannot complete batch with status ${batch.status}`);
    }

    return await prisma.$transaction(async (tx) => {
      const totalCost =
        (batch.ingredientCost?.toNumber() || 0) + (laborCost || 0) + (overheadCost || 0);
      const costPerUnit = actualQuantity > 0 ? totalCost / actualQuantity : 0;

      // Add manufactured product to stock
      await tx.product.update({
        where: { id: batch.recipe.productId },
        data: {
          currentStock: { increment: actualQuantity },
          costPrice: costPerUnit, // Update cost price based on production cost
        },
      });

      // Record movement
      await tx.productMovement.create({
        data: {
          type: 'PRODUCTION_OUTPUT',
          productId: batch.recipe.productId,
          quantity: actualQuantity,
          referenceType: 'PRODUCTION_BATCH',
          referenceId: batchId,
          cost: totalCost,
          notes: `Production batch ${batch.batchNumber} completed`,
          tenantId: batch.tenantId,
        },
      });

      // Update batch
      const updatedBatch = await tx.productionBatch.update({
        where: { id: batchId },
        data: {
          status: 'COMPLETED',
          actualQuantity,
          completedAt: new Date(),
          laborCost,
          overheadCost,
          totalCost,
          costPerUnit,
        },
        include: {
          recipe: {
            include: {
              product: true,
              ingredients: { include: { ingredient: true } },
            },
          },
        },
      });

      return updatedBatch;
    });
  }

  /**
   * Cancel production batch
   */
  async cancelBatch(batchId: string, tenantId: string, reason?: string) {
    const batch = await prisma.productionBatch.findFirst({
      where: { id: batchId, tenantId },
      include: {
        recipe: {
          include: { ingredients: { include: { ingredient: true } } },
        },
      },
    });

    if (!batch) {
      throw new Error('Batch not found');
    }

    return await prisma.$transaction(async (tx) => {
      // If batch was in progress, return ingredients to stock
      if (batch.status === 'IN_PROGRESS') {
        for (const ing of batch.recipe.ingredients) {
          if (ing.isOptional) continue;

          const qtyToReturn = ing.quantity.toNumber() * batch.plannedQuantity;

          // Add back to stock
          await tx.product.update({
            where: { id: ing.ingredientId },
            data: {
              currentStock: { increment: Math.floor(qtyToReturn) },
            },
          });

          // Record movement
          await tx.productMovement.create({
            data: {
              type: 'ADJUSTMENT',
              productId: ing.ingredientId,
              quantity: Math.floor(qtyToReturn),
              referenceType: 'PRODUCTION_BATCH',
              referenceId: batchId,
              notes: `Returned from cancelled batch ${batch.batchNumber}. Reason: ${reason || 'Not specified'}`,
              tenantId,
            },
          });
        }
      }

      // Update batch status
      return await tx.productionBatch.update({
        where: { id: batchId },
        data: {
          status: 'CANCELLED',
          notes: `${batch.notes || ''}\n\nCancelled: ${reason || 'Not specified'}`,
        },
      });
    });
  }

  /**
   * Get batch by ID
   */
  async getBatch(batchId: string, tenantId: string) {
    return await prisma.productionBatch.findFirst({
      where: { id: batchId, tenantId },
      include: {
        recipe: {
          include: {
            product: true,
            ingredients: { include: { ingredient: true } },
          },
        },
      },
    });
  }

  /**
   * List batches with filters
   */
  async listBatches(
    tenantId: string,
    filters: {
      status?: string;
      productId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    return await prisma.productionBatch.findMany({
      where: {
        tenantId,
        status: filters.status as any,
        productId: filters.productId,
        createdAt: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      include: {
        recipe: {
          include: {
            product: true,
            ingredients: { include: { ingredient: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get production statistics
   */
  async getProductionStats(tenantId: string, startDate?: Date, endDate?: Date) {
    const batches = await prisma.productionBatch.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        recipe: {
          include: { product: true },
        },
      },
    });

    const stats = {
      totalBatches: batches.length,
      totalUnitsProduced: batches.reduce((sum, b) => sum + (b.actualQuantity || 0), 0),
      totalCost: batches.reduce((sum, b) => sum + (b.totalCost?.toNumber() || 0), 0),
      averageCostPerUnit:
        batches.reduce((sum, b) => sum + (b.costPerUnit?.toNumber() || 0), 0) / (batches.length || 1),
      byProduct: {} as Record<
        string,
        {
          productName: string;
          batches: number;
          unitsProduced: number;
          totalCost: number;
        }
      >,
    };

    batches.forEach((batch) => {
      const productId = batch.recipe.productId;
      if (!stats.byProduct[productId]) {
        stats.byProduct[productId] = {
          productName: batch.recipe.product.name,
          batches: 0,
          unitsProduced: 0,
          totalCost: 0,
        };
      }

      stats.byProduct[productId].batches++;
      stats.byProduct[productId].unitsProduced += batch.actualQuantity || 0;
      stats.byProduct[productId].totalCost += batch.totalCost?.toNumber() || 0;
    });

    return stats;
  }
}

export const productionService = new ProductionService();
