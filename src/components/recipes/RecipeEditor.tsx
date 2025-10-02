'use client';

import { useState, useEffect } from 'react';

interface Ingredient {
  id: string;
  name: string;
  currentStock: number;
  unit: string;
  costPrice?: number;
}

interface RecipeIngredient {
  id?: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  isOptional: boolean;
  ingredient?: Ingredient;
}

interface Recipe {
  id: string;
  productId: string;
  name: string;
  description?: string;
  servingSize: number;
  prepTime?: number;
  cookTime?: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  instructions?: string;
  isDefault: boolean;
  ingredients: RecipeIngredient[];
}

interface RecipeEditorProps {
  productId: string;
  productName: string;
  recipe: Recipe | null;
  onSave: () => void;
}

export default function RecipeEditor({ productId, productName, recipe, onSave }: RecipeEditorProps) {
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [recipeData, setRecipeData] = useState({
    name: recipe?.name || `${productName} Recipe`,
    description: recipe?.description || '',
    servingSize: recipe?.servingSize || 1,
    prepTime: recipe?.prepTime || 0,
    cookTime: recipe?.cookTime || 0,
    difficulty: recipe?.difficulty || 'EASY',
    instructions: recipe?.instructions || '',
  });
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(recipe?.ingredients || []);
  const [newIngredient, setNewIngredient] = useState({
    ingredientId: '',
    quantity: 0,
    unit: '',
    isOptional: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAvailableIngredients();
  }, []);

  const loadAvailableIngredients = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const response = await fetch('/api/products/ingredients', {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableIngredients(data);
      }
    } catch (error) {
      console.error('Error loading ingredients:', error);
    }
  };

  const handleAddIngredient = async () => {
    if (!newIngredient.ingredientId || newIngredient.quantity <= 0) {
      setError('Please select an ingredient and enter a valid quantity');
      return;
    }

    const ingredient = availableIngredients.find((i) => i.id === newIngredient.ingredientId);
    if (!ingredient) return;

    setLoading(true);
    setError('');

    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);

      if (recipe) {
        // Add ingredient to existing recipe
        const response = await fetch(`/api/recipes/${recipe.id}/ingredients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': user.tenantId,
          },
          body: JSON.stringify({
            ingredientId: newIngredient.ingredientId,
            quantity: newIngredient.quantity,
            unit: newIngredient.unit || ingredient.unit,
            isOptional: newIngredient.isOptional,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add ingredient');
        }

        const addedIngredient = await response.json();
        setIngredients([...ingredients, addedIngredient]);
        setSuccess('Ingredient added successfully');
      } else {
        // Add to local state (recipe not created yet)
        setIngredients([
          ...ingredients,
          {
            ingredientId: newIngredient.ingredientId,
            quantity: newIngredient.quantity,
            unit: newIngredient.unit || ingredient.unit,
            isOptional: newIngredient.isOptional,
            ingredient,
          },
        ]);
      }

      // Reset form
      setNewIngredient({
        ingredientId: '',
        quantity: 0,
        unit: '',
        isOptional: false,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to add ingredient');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveIngredient = async (index: number) => {
    const ingredient = ingredients[index];

    if (ingredient.id && recipe) {
      // Remove from server
      setLoading(true);
      try {
        const userData = localStorage.getItem('user');
        if (!userData) return;

        const user = JSON.parse(userData);
        const response = await fetch(`/api/recipes/${recipe.id}/ingredients/${ingredient.id}`, {
          method: 'DELETE',
          headers: {
            'x-tenant-id': user.tenantId,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to remove ingredient');
        }

        setIngredients(ingredients.filter((_, i) => i !== index));
        setSuccess('Ingredient removed');
      } catch (err: any) {
        setError(err.message || 'Failed to remove ingredient');
      } finally {
        setLoading(false);
      }
    } else {
      // Remove from local state
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const handleSaveRecipe = async () => {
    if (ingredients.length === 0) {
      setError('Please add at least one ingredient');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);

      if (recipe) {
        // Update existing recipe
        const response = await fetch(`/api/recipes/${recipe.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': user.tenantId,
          },
          body: JSON.stringify(recipeData),
        });

        if (!response.ok) {
          throw new Error('Failed to update recipe');
        }

        setSuccess('Recipe updated successfully');
        onSave();
      } else {
        // Create new recipe with ingredients
        const response = await fetch('/api/recipes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': user.tenantId,
          },
          body: JSON.stringify({
            productId,
            ...recipeData,
            ingredients: ingredients.map((ing) => ({
              ingredientId: ing.ingredientId,
              quantity: ing.quantity,
              unit: ing.unit,
              isOptional: ing.isOptional,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create recipe');
        }

        setSuccess('Recipe created successfully');
        onSave();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save recipe');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCost = () => {
    return ingredients.reduce((total, ing) => {
      const ingredient = ing.ingredient || availableIngredients.find((i) => i.id === ing.ingredientId);
      if (!ingredient?.costPrice) return total;
      return total + ingredient.costPrice * ing.quantity;
    }, 0);
  };

  const selectedIngredient = availableIngredients.find((i) => i.id === newIngredient.ingredientId);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Recipe Basic Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipe Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name</label>
            <input
              type="text"
              value={recipeData.name}
              onChange={(e) => setRecipeData({ ...recipeData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <select
              value={recipeData.difficulty}
              onChange={(e) => setRecipeData({ ...recipeData, difficulty: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Serving Size</label>
            <input
              type="number"
              value={recipeData.servingSize}
              onChange={(e) => setRecipeData({ ...recipeData, servingSize: parseInt(e.target.value) || 1 })}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prep (min)</label>
              <input
                type="number"
                value={recipeData.prepTime}
                onChange={(e) => setRecipeData({ ...recipeData, prepTime: parseInt(e.target.value) || 0 })}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cook (min)</label>
              <input
                type="number"
                value={recipeData.cookTime}
                onChange={(e) => setRecipeData({ ...recipeData, cookTime: parseInt(e.target.value) || 0 })}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={recipeData.description}
            onChange={(e) => setRecipeData({ ...recipeData, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Optional recipe description"
          />
        </div>
      </div>

      {/* Ingredients Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Ingredients</h3>
          <div className="text-sm text-gray-600">
            Estimated Cost: <span className="font-bold text-gray-900">${calculateTotalCost().toFixed(2)}</span>
          </div>
        </div>

        {/* Add Ingredient Form */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ingredient</label>
              <select
                value={newIngredient.ingredientId}
                onChange={(e) => {
                  const ing = availableIngredients.find((i) => i.id === e.target.value);
                  setNewIngredient({
                    ...newIngredient,
                    ingredientId: e.target.value,
                    unit: ing?.unit || '',
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select ingredient...</option>
                {availableIngredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({ing.currentStock} {ing.unit} available)
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                value={newIngredient.quantity || ''}
                onChange={(e) => setNewIngredient({ ...newIngredient, quantity: parseFloat(e.target.value) || 0 })}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input
                type="text"
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={selectedIngredient?.unit || 'Unit'}
              />
            </div>

            <div className="md:col-span-2 flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newIngredient.isOptional}
                  onChange={(e) => setNewIngredient({ ...newIngredient, isOptional: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Optional</span>
              </label>
            </div>

            <div className="md:col-span-1 flex items-end">
              <button
                onClick={handleAddIngredient}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:bg-blue-300"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Ingredients List */}
        <div className="space-y-2">
          {ingredients.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No ingredients added yet</p>
          ) : (
            ingredients.map((ing, index) => {
              const ingredient = ing.ingredient || availableIngredients.find((i) => i.id === ing.ingredientId);
              const cost = ingredient?.costPrice ? ingredient.costPrice * ing.quantity : 0;

              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {ingredient?.name || 'Unknown'}
                      {ing.isOptional && <span className="ml-2 text-xs text-gray-500">(Optional)</span>}
                    </div>
                    <div className="text-sm text-gray-600">
                      {ing.quantity} {ing.unit}
                      {cost > 0 && <span className="ml-2 text-gray-500">• ${cost.toFixed(2)}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveIngredient(index)}
                    className="text-red-600 hover:text-red-700 px-3 py-1"
                    disabled={loading}
                  >
                    Remove
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
        <textarea
          value={recipeData.instructions}
          onChange={(e) => setRecipeData({ ...recipeData, instructions: e.target.value })}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Step-by-step cooking instructions..."
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveRecipe}
          disabled={loading || ingredients.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:bg-blue-300"
        >
          {loading ? 'Saving...' : recipe ? 'Update Recipe' : 'Create Recipe'}
        </button>
      </div>
    </div>
  );
}
