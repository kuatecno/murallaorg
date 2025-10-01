import { PrismaClient, Recipe, RecipeIngredient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateRecipeDto {
  productId: string;
  name: string;
  description?: string;
  servingSize?: number;
  prepTime?: number;
  cookTime?: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  instructions?: string;
  isDefault?: boolean;
  tenantId: string;
}

export interface AddIngredientDto {
  ingredientId: string;
  quantity: number;
  unit: string;
  isOptional?: boolean;
  notes?: string;
}

export interface ProjectedInventory {
  productId: string;
  productName: string;
  canMake: number;
  limitingIngredient: {
    id: string;
    name: string;
    available: number;
    required: number;
  } | null;
  recipe: {
    id: string;
    name: string;
    ingredients: {
      id: string;
      name: string;
      required: number;
      available: number;
      unit: string;
      isOptional: boolean;
    }[];
  };
}

export class RecipeService {
  /**
   * Create a new recipe
   */
  async createRecipe(data: CreateRecipeDto): Promise<Recipe> {
    const recipe = await prisma.recipe.create({
      data: {
        productId: data.productId,
        name: data.name,
        description: data.description,
        servingSize: data.servingSize || 1,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        difficulty: data.difficulty || 'EASY',
        instructions: data.instructions,
        isDefault: data.isDefault || false,
        tenantId: data.tenantId,
      },
      include: {
        ingredients: true,
      },
    });

    // Update product hasRecipe flag
    await prisma.product.update({
      where: { id: data.productId },
      data: { hasRecipe: true },
    });

    return recipe;
  }

  /**
   * Get recipe by ID
   */
  async getRecipe(recipeId: string, tenantId: string) {
    return await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        tenantId,
      },
      include: {
        product: true,
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });
  }

  /**
   * Get all recipes for a product
   */
  async getProductRecipes(productId: string, tenantId: string) {
    return await prisma.recipe.findMany({
      where: {
        productId,
        tenantId,
        isActive: true,
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { version: 'desc' }],
    });
  }

  /**
   * Get default recipe for a product
   */
  async getDefaultRecipe(productId: string, tenantId: string) {
    return await prisma.recipe.findFirst({
      where: {
        productId,
        tenantId,
        isActive: true,
        isDefault: true,
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });
  }

  /**
   * Add ingredient to recipe
   */
  async addIngredient(recipeId: string, data: AddIngredientDto, tenantId: string): Promise<RecipeIngredient> {
    // Get ingredient details for costing
    const ingredient = await prisma.product.findUnique({
      where: { id: data.ingredientId },
    });

    if (!ingredient) {
      throw new Error('Ingredient not found');
    }

    const recipeIngredient = await prisma.recipeIngredient.create({
      data: {
        recipeId,
        ingredientId: data.ingredientId,
        quantity: data.quantity,
        unit: data.unit,
        isOptional: data.isOptional || false,
        notes: data.notes,
        unitCost: ingredient.costPrice,
        totalCost: ingredient.costPrice ? ingredient.costPrice.toNumber() * data.quantity : null,
      },
      include: {
        ingredient: true,
      },
    });

    // Recalculate recipe costs
    await this.updateRecipeCosts(recipeId);

    return recipeIngredient;
  }

  /**
   * Update ingredient quantity
   */
  async updateIngredient(
    ingredientId: string,
    recipeId: string,
    data: Partial<AddIngredientDto>,
    tenantId: string
  ) {
    const updated = await prisma.recipeIngredient.update({
      where: { id: ingredientId },
      data: {
        quantity: data.quantity,
        unit: data.unit,
        isOptional: data.isOptional,
        notes: data.notes,
      },
    });

    // Recalculate recipe costs
    await this.updateRecipeCosts(recipeId);

    return updated;
  }

  /**
   * Remove ingredient from recipe
   */
  async removeIngredient(ingredientId: string, recipeId: string, tenantId: string) {
    await prisma.recipeIngredient.delete({
      where: { id: ingredientId },
    });

    // Recalculate recipe costs
    await this.updateRecipeCosts(recipeId);
  }

  /**
   * Calculate and update recipe costs
   */
  async updateRecipeCosts(recipeId: string) {
    const ingredients = await prisma.recipeIngredient.findMany({
      where: { recipeId },
      include: { ingredient: true },
    });

    const estimatedCost = ingredients.reduce((sum, ing) => {
      const cost = ing.ingredient.costPrice?.toNumber() || 0;
      return sum + cost * ing.quantity.toNumber();
    }, 0);

    await prisma.recipe.update({
      where: { id: recipeId },
      data: {
        estimatedCost,
        totalCost: estimatedCost,
      },
    });
  }

  /**
   * Get projected inventory (how many units can be made)
   */
  async getProjectedInventory(productId: string, tenantId: string): Promise<ProjectedInventory> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
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

    if (!product || !product.recipesAsProduct[0]) {
      return {
        productId,
        productName: product?.name || 'Unknown',
        canMake: 0,
        limitingIngredient: null,
        recipe: {
          id: '',
          name: '',
          ingredients: [],
        },
      };
    }

    const recipe = product.recipesAsProduct[0];
    let minCanMake = Infinity;
    let limitingIngredient: {
      id: string;
      name: string;
      available: number;
      required: number;
    } | null = null;

    for (const ing of recipe.ingredients) {
      if (ing.isOptional) continue;

      const available = ing.ingredient.currentStock;
      const required = ing.quantity.toNumber();
      const canMake = required > 0 ? Math.floor(available / required) : Infinity;

      if (canMake < minCanMake) {
        minCanMake = canMake;
        limitingIngredient = {
          id: ing.ingredient.id,
          name: ing.ingredient.name,
          available,
          required,
        };
      }
    }

    return {
      productId: product.id,
      productName: product.name,
      canMake: minCanMake === Infinity ? 0 : minCanMake,
      limitingIngredient,
      recipe: {
        id: recipe.id,
        name: recipe.name,
        ingredients: recipe.ingredients.map((ing) => ({
          id: ing.ingredient.id,
          name: ing.ingredient.name,
          required: ing.quantity.toNumber(),
          available: ing.ingredient.currentStock,
          unit: ing.unit,
          isOptional: ing.isOptional,
        })),
      },
    };
  }

  /**
   * Get projected inventory for all products with recipes
   */
  async getAllProjectedInventory(tenantId: string): Promise<ProjectedInventory[]> {
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        hasRecipe: true,
        isActive: true,
      },
    });

    const results = await Promise.all(
      products.map((product) => this.getProjectedInventory(product.id, tenantId))
    );

    return results.filter((r) => r.recipe.id !== '');
  }

  /**
   * Check if enough ingredients are available
   */
  async checkIngredientAvailability(
    recipeId: string,
    quantity: number,
    tenantId: string
  ): Promise<{
    success: boolean;
    missing: string[];
  }> {
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, tenantId },
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
   * Duplicate a recipe (for versioning)
   */
  async duplicateRecipe(recipeId: string, tenantId: string) {
    const original = await prisma.recipe.findFirst({
      where: { id: recipeId, tenantId },
      include: { ingredients: true },
    });

    if (!original) {
      throw new Error('Recipe not found');
    }

    // Create new version
    const newRecipe = await prisma.recipe.create({
      data: {
        productId: original.productId,
        name: `${original.name} v${original.version + 1}`,
        description: original.description,
        servingSize: original.servingSize,
        prepTime: original.prepTime,
        cookTime: original.cookTime,
        difficulty: original.difficulty,
        instructions: original.instructions,
        version: original.version + 1,
        isActive: true,
        isDefault: false,
        tenantId: original.tenantId,
      },
    });

    // Copy ingredients
    for (const ing of original.ingredients) {
      await prisma.recipeIngredient.create({
        data: {
          recipeId: newRecipe.id,
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          isOptional: ing.isOptional,
          notes: ing.notes,
          unitCost: ing.unitCost,
          totalCost: ing.totalCost,
        },
      });
    }

    return newRecipe;
  }

  /**
   * Set recipe as default
   */
  async setDefaultRecipe(recipeId: string, tenantId: string) {
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, tenantId },
    });

    if (!recipe) {
      throw new Error('Recipe not found');
    }

    // Remove default from all other recipes for this product
    await prisma.recipe.updateMany({
      where: {
        productId: recipe.productId,
        tenantId,
      },
      data: { isDefault: false },
    });

    // Set this recipe as default
    return await prisma.recipe.update({
      where: { id: recipeId },
      data: { isDefault: true },
    });
  }
}

export const recipeService = new RecipeService();
