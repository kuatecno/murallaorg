'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductNavigation from '@/components/products/ProductNavigation';

interface Category {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  color: string;
  isActive: boolean;
  productCount?: number;
}

// Predefined categories from enrichment system
const PREDEFINED_CATEGORIES: Category[] = [
  // Barra - Café
  { id: '☕🔥 Café Caliente', name: '☕🔥 Café Caliente', emoji: '☕🔥', color: '#92400E', isActive: true, productCount: 0 },
  { id: '☕❄️ Café Frío', name: '☕❄️ Café Frío', emoji: '☕❄️', color: '#1E3A8A', isActive: true, productCount: 0 },
  { id: '☕🌀 Café Frapeado', name: '☕🌀 Café Frapeado', emoji: '☕🌀', color: '#7C3AED', isActive: true, productCount: 0 },
  // Barra - Matcha
  { id: '🍵🔥 Matcha Caliente', name: '🍵🔥 Matcha Caliente', emoji: '🍵🔥', color: '#15803D', isActive: true, productCount: 0 },
  { id: '🍵❄️ Matcha Frío', name: '🍵❄️ Matcha Frío', emoji: '🍵❄️', color: '#059669', isActive: true, productCount: 0 },
  { id: '🍵🌀 Matcha Frapeado', name: '🍵🌀 Matcha Frapeado', emoji: '🍵🌀', color: '#10B981', isActive: true, productCount: 0 },
  // Barra - Té
  { id: '🫖🔥 Té Caliente', name: '🫖🔥 Té Caliente', emoji: '🫖🔥', color: '#B45309', isActive: true, productCount: 0 },
  { id: '🫖❄️ Té Frío', name: '🫖❄️ Té Frío', emoji: '🫖❄️', color: '#0891B2', isActive: true, productCount: 0 },
  { id: '🫖🌀 Té Frapeado', name: '🫖🌀 Té Frapeado', emoji: '🫖🌀', color: '#06B6D4', isActive: true, productCount: 0 },
  // Barra - Otros
  { id: '🍋 Jugos Naturales y Limonadas', name: '🍋 Jugos Naturales y Limonadas', emoji: '🍋', color: '#CA8A04', isActive: true, productCount: 0 },
  { id: '🥤 Frapés', name: '🥤 Frapés', emoji: '🥤', color: '#EC4899', isActive: true, productCount: 0 },
  { id: '🍹 Mocktails', name: '🍹 Mocktails', emoji: '🍹', color: '#F43F5E', isActive: true, productCount: 0 },
  // Main categories
  { id: '🍜 Comida', name: '🍜 Comida', emoji: '🍜', color: '#DC2626', isActive: true, productCount: 0 },
  { id: '🍰 Antojitos', name: '🍰 Antojitos', emoji: '🍰', color: '#DB2777', isActive: true, productCount: 0 },
  { id: '🎨 Arte', name: '🎨 Arte', emoji: '🎨', color: '#9333EA', isActive: true, productCount: 0 },
];

const DEFAULT_EMOJIS = [
  '🍔', '🍕', '🍰', '☕', '🍺', '🥗', '🍜', '🍣',
  '🥐', '🧁', '🍪', '🍩', '🥤', '🧃', '🍷', '🥃',
  '🥘', '🍝', '🌮', '🌯', '🍱', '🥟', '🍛', '🍲',
  '📦', '🧊', '🥫', '🧂', '🍯', '🧈', '🫖', '🍵', '🍋', '🍹', '🎨'
];

const DEFAULT_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1',
  '#8B5CF6', '#EC4899', '#F43F5E', '#84CC16', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#6366F1', '#A855F7', '#D946EF',
  '#92400E', '#1E3A8A', '#7C3AED', '#15803D', '#059669',
  '#B45309', '#0891B2', '#CA8A04', '#DC2626', '#DB2777', '#9333EA'
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    emoji: '📦',
    color: '#3B82F6',
  });
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    loadCategories();
  }, [router]);

  const loadCategories = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);

      // Start with predefined categories
      const categoryMap = new Map<string, Category>();

      // Add predefined categories first
      PREDEFINED_CATEGORIES.forEach(cat => {
        categoryMap.set(cat.name, { ...cat });
      });

      // Get unique categories from products and update counts
      const productsResponse = await fetch('/api/products', {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        const products = productsData.data || productsData;

        // Update product counts for existing categories
        products.forEach((product: any) => {
          if (product.category) {
            if (categoryMap.has(product.category)) {
              // Update existing predefined category count
              const cat = categoryMap.get(product.category)!;
              cat.productCount = (cat.productCount || 0) + 1;
            } else {
              // Add new custom category not in predefined list
              categoryMap.set(product.category, {
                id: product.category,
                name: product.category,
                color: '#3B82F6',
                emoji: '📦',
                isActive: true,
                productCount: 1,
              });
            }
          }
        });
      }

      setCategories(Array.from(categoryMap.values()));
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        emoji: category.emoji || '📦',
        color: category.color,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        emoji: '📦',
        color: '#3B82F6',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      emoji: '📦',
      color: '#3B82F6',
    });
  };

  const handleSaveCategory = async () => {
    if (!formData.name.trim()) {
      alert('Category name is required');
      return;
    }

    // Check for duplicate name (excluding current category if editing)
    const duplicate = categories.find(
      (cat) => cat.name.toLowerCase() === formData.name.toLowerCase() &&
      cat.id !== editingCategory?.id
    );

    if (duplicate) {
      alert('A category with this name already exists');
      return;
    }

    setActionLoading(true);
    try {
      if (editingCategory) {
        // Update category (rename products)
        const userData = localStorage.getItem('user');
        if (!userData) return;

        const user = JSON.parse(userData);

        // Get all products with this category
        const productsResponse = await fetch('/api/products', {
          headers: {
            'x-tenant-id': user.tenantId,
          },
        });

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          const products = (productsData.data || productsData).filter(
            (p: any) => p.category === editingCategory.name
          );

          // Update each product's category
          for (const product of products) {
            await fetch(`/api/products/${product.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': user.tenantId,
              },
              body: JSON.stringify({
                category: formData.name,
              }),
            });
          }
        }
      }

      handleCloseModal();
      loadCategories();
    } catch (error: any) {
      alert(error.message || 'Failed to save category');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`Delete category "${category.name}"? This will remove the category from ${category.productCount} product(s).`)) {
      return;
    }

    setActionLoading(true);
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);

      // Get all products with this category
      const productsResponse = await fetch('/api/products', {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        const products = (productsData.data || productsData).filter(
          (p: any) => p.category === category.name
        );

        // Remove category from each product
        for (const product of products) {
          await fetch(`/api/products/${product.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-tenant-id': user.tenantId,
            },
            body: JSON.stringify({
              category: null,
            }),
          });
        }
      }

      loadCategories();
    } catch (error: any) {
      alert(error.message || 'Failed to delete category');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCategories = categories.filter((category) => {
    const matchesSearch =
      searchQuery === '' ||
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesActive = !showActiveOnly || category.isActive;
    return matchesSearch && matchesActive;
  });

  if (loading) {
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
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + New Category
            </button>
          </div>
          <ProductNavigation />
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Show active only</span>
            </label>
          </div>
        </div>

        {/* Categories Grid */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {categories.length === 0
                ? 'No categories yet. Categories are created when you assign them to products.'
                : 'No categories found matching your search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
                style={{ borderLeft: `4px solid ${category.color}` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">{category.emoji}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    {category.productCount || 0} product{category.productCount !== 1 ? 's' : ''}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOpenModal(category)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      disabled={actionLoading}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                      disabled={actionLoading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto my-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 px-6 py-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Beverages"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
                <div className="grid grid-cols-8 gap-2">
                  {DEFAULT_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, emoji })}
                      className={`text-2xl p-2 rounded-lg transition-colors ${
                        formData.emoji === emoji
                          ? 'bg-blue-100 ring-2 ring-blue-600'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="grid grid-cols-8 gap-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-2">Preview</div>
                <div
                  className="bg-white rounded-lg p-4"
                  style={{ borderLeft: `4px solid ${formData.color}` }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">{formData.emoji}</div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {formData.name || 'Category Name'}
                      </div>
                      {formData.description && (
                        <div className="text-sm text-gray-500">{formData.description}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                disabled={actionLoading}
              >
                {actionLoading ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
