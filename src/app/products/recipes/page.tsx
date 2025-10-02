'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Product {
  id: string;
  sku: string;
  name: string;
  type: string;
  hasRecipe: boolean;
}

interface RecipeIngredient {
  id: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  isOptional: boolean;
  unitCost?: number;
  totalCost?: number;
  ingredient: {
    id: string;
    name: string;
    currentStock: number;
    unit: string;
    costPrice?: number;
  };
}

interface Recipe {
  id: string;
  productId: string;
  name: string;
  description?: string;
  servingSize: number;
  prepTime?: number;
  cookTime?: number;
  difficulty: string;
  instructions?: string;
  estimatedCost?: number;
  totalCost?: number;
  version: number;
  isActive: boolean;
  isDefault: boolean;
  ingredients: RecipeIngredient[];
}

interface ProjectedInventory {
  productId: string;
  productName: string;
  canMake: number;
  limitingIngredient?: {
    id: string;
    name: string;
    available: number;
    required: number;
  };
  recipe: Recipe;
}

type TabType = 'projected' | 'recipes' | 'editor';

export default function RecipesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [projectedInventory, setProjectedInventory] = useState<ProjectedInventory | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('projected');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    loadProducts();
  }, [router]);

  const loadProducts = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const response = await fetch('/api/products?type=MANUFACTURED&type=MADE_TO_ORDER', {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter products that have recipes
        const productsWithRecipes = (data.data || data).filter(
          (p: Product) => p.type === 'MANUFACTURED' || p.type === 'MADE_TO_ORDER'
        );
        setProducts(productsWithRecipes);

        if (productsWithRecipes.length > 0 && !selectedProduct) {
          handleSelectProduct(productsWithRecipes[0]);
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = async (product: Product) => {
    setSelectedProduct(product);
    setLoading(true);

    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);

      // Load recipes for this product
      const recipesResponse = await fetch(`/api/recipes?productId=${product.id}`, {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (recipesResponse.ok) {
        const recipesData = await recipesResponse.json();
        setRecipes(recipesData);
      }

      // Load projected inventory
      const projectedResponse = await fetch(
        `/api/recipes/projected-inventory?productId=${product.id}`,
        {
          headers: {
            'x-tenant-id': user.tenantId,
          },
        }
      );

      if (projectedResponse.ok) {
        const projectedData = await projectedResponse.json();
        setProjectedInventory(projectedData);
      }
    } catch (error) {
      console.error('Error loading recipe data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusColor = (available: number, required: number) => {
    const canMake = Math.floor(available / required);
    if (canMake === 0) return 'text-red-600';
    if (canMake < 10) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getDifficultyBadge = (difficulty: string) => {
    const badges = {
      EASY: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HARD: 'bg-orange-100 text-orange-800',
      EXPERT: 'bg-red-100 text-red-800',
    };
    return badges[difficulty as keyof typeof badges] || badges.EASY;
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/products" className="text-gray-600 hover:text-gray-900">
                ← Back to Products
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Recipe Management</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              No products with recipes found. Create a MANUFACTURED or MADE_TO_ORDER product first.
            </p>
            <Link
              href="/products"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Go to Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Product Selector Sidebar */}
            <div className="col-span-12 lg:col-span-3">
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Select Product</h2>
                <div className="space-y-2">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedProduct?.id === product.id
                          ? 'bg-blue-50 border-2 border-blue-600'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="font-medium text-gray-900 text-sm">{product.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{product.sku}</div>
                      <div className="text-xs mt-1">
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            product.type === 'MANUFACTURED'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {product.type === 'MANUFACTURED' ? 'Batch' : 'On-demand'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="col-span-12 lg:col-span-9">
              {selectedProduct && (
                <>
                  {/* Tabs */}
                  <div className="bg-white rounded-lg shadow mb-6">
                    <div className="border-b border-gray-200">
                      <nav className="flex -mb-px">
                        <button
                          onClick={() => setActiveTab('projected')}
                          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'projected'
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          📊 Projected Inventory
                        </button>
                        <button
                          onClick={() => setActiveTab('recipes')}
                          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'recipes'
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          📝 Recipes
                        </button>
                        <button
                          onClick={() => setActiveTab('editor')}
                          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'editor'
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          ✏️ Edit Recipe
                        </button>
                      </nav>
                    </div>
                  </div>

                  {/* Tab Content */}
                  {activeTab === 'projected' && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-bold text-gray-900 mb-4">
                        Projected Inventory for {selectedProduct.name}
                      </h2>

                      {loading ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : projectedInventory ? (
                        <>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                            <div className="text-center">
                              <div className="text-sm text-gray-600 mb-2">You can make</div>
                              <div className="text-5xl font-bold text-blue-600 mb-2">
                                {projectedInventory.canMake}
                              </div>
                              <div className="text-sm text-gray-600">
                                units with current stock
                              </div>
                            </div>
                          </div>

                          {projectedInventory.limitingIngredient && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                              <div className="flex items-start">
                                <span className="text-yellow-600 text-xl mr-3">⚠️</span>
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    Limiting Ingredient: {projectedInventory.limitingIngredient.name}
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    Available: {projectedInventory.limitingIngredient.available} units |
                                    Required per serving: {projectedInventory.limitingIngredient.required} units
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          <h3 className="font-semibold text-gray-900 mb-3">Ingredient Breakdown</h3>
                          <div className="space-y-3">
                            {projectedInventory.recipe.ingredients.map((ing) => {
                              const available = ing.ingredient.currentStock;
                              const required = ing.quantity;
                              const canMake = Math.floor(available / required);

                              return (
                                <div
                                  key={ing.id}
                                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                >
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">
                                      {ing.ingredient.name}
                                      {ing.isOptional && (
                                        <span className="ml-2 text-xs text-gray-500">(Optional)</span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                      Required: {required} {ing.unit} per serving
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div
                                      className={`text-lg font-semibold ${getStockStatusColor(
                                        available,
                                        required
                                      )}`}
                                    >
                                      {canMake} units
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {available} {ing.ingredient.unit} available
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-500">No recipe found for this product.</p>
                      )}
                    </div>
                  )}

                  {activeTab === 'recipes' && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-gray-900">
                          Recipes for {selectedProduct.name}
                        </h2>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
                          + New Version
                        </button>
                      </div>

                      {recipes.length === 0 ? (
                        <p className="text-gray-500">No recipes found.</p>
                      ) : (
                        <div className="space-y-4">
                          {recipes.map((recipe) => (
                            <div
                              key={recipe.id}
                              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h3 className="font-semibold text-gray-900">{recipe.name}</h3>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs ${getDifficultyBadge(
                                        recipe.difficulty
                                      )}`}
                                    >
                                      {recipe.difficulty}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      Version {recipe.version}
                                    </span>
                                    {recipe.isDefault && (
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-gray-600">Cost</div>
                                  <div className="text-lg font-bold text-gray-900">
                                    ${recipe.totalCost?.toFixed(0) || '0'}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                                <div>
                                  <span className="text-gray-500">Serving:</span>{' '}
                                  <span className="font-medium">{recipe.servingSize}</span>
                                </div>
                                {recipe.prepTime && (
                                  <div>
                                    <span className="text-gray-500">Prep:</span>{' '}
                                    <span className="font-medium">{recipe.prepTime} min</span>
                                  </div>
                                )}
                                {recipe.cookTime && (
                                  <div>
                                    <span className="text-gray-500">Cook:</span>{' '}
                                    <span className="font-medium">{recipe.cookTime} min</span>
                                  </div>
                                )}
                              </div>

                              <div className="border-t pt-3">
                                <div className="text-sm font-medium text-gray-700 mb-2">
                                  Ingredients ({recipe.ingredients.length})
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {recipe.ingredients.map((ing) => (
                                    <span
                                      key={ing.id}
                                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                    >
                                      {ing.ingredient.name} ({ing.quantity} {ing.unit})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'editor' && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-bold text-gray-900 mb-4">Recipe Editor</h2>
                      <p className="text-gray-500">Recipe editor coming soon...</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
