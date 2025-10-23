'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CreateProductModal from '@/components/products/CreateProductModal';
import ProductNavigation from '@/components/products/ProductNavigation';
import ProductEnrichmentModal from '@/components/products/ProductEnrichmentModal';

interface Product {
  id: string;
  sku: string;
  ean?: string;
  name: string;
  description?: string;
  type: 'INPUT' | 'READY_PRODUCT' | 'MANUFACTURED' | 'MADE_TO_ORDER' | 'SERVICE';
  category?: string;
  brand?: string;
  unitPrice: number;
  costPrice?: number;
  currentStock: number;
  minStock: number;
  unit: string;
  hasRecipe: boolean;
  isActive: boolean;
  menuSection?: string;
  hoy?: boolean;
  cafePrice?: number;
  rappiPrice?: number;
  pedidosyaPrice?: number;
  uberPrice?: number;
  images?: string[];
}

type ViewMode = 'grid' | 'table';
type FilterType = 'ALL' | 'INPUT' | 'READY_PRODUCT' | 'MANUFACTURED' | 'MADE_TO_ORDER' | 'SERVICE';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEnrichModalOpen, setIsEnrichModalOpen] = useState(false);
  const [selectedProductForEnrich, setSelectedProductForEnrich] = useState<Product | null>(null);
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
      const response = await fetch('/api/products', {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          setProducts(data.data);
        } else if (Array.isArray(data)) {
          setProducts(data);
        } else {
          console.error('Invalid products data format:', data);
          setProducts([]);
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesType = filterType === 'ALL' || product.type === filterType;
    const matchesSearch =
      searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getProductTypeBadge = (type: string) => {
    const badges = {
      INPUT: { label: 'Input', color: 'bg-gray-100 text-gray-800' },
      READY_PRODUCT: { label: 'Ready Product', color: 'bg-blue-100 text-blue-800' },
      MANUFACTURED: { label: 'Manufactured', color: 'bg-orange-100 text-orange-800' },
      MADE_TO_ORDER: { label: 'Made to Order', color: 'bg-green-100 text-green-800' },
      SERVICE: { label: 'Service', color: 'bg-purple-100 text-purple-800' },
    };
    const badge = badges[type as keyof typeof badges] || badges.INPUT;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getStockStatus = (currentStock: number, minStock: number) => {
    if (currentStock === 0) return { label: 'Out of Stock', color: 'text-red-600' };
    if (currentStock <= minStock) return { label: 'Low Stock', color: 'text-yellow-600' };
    return { label: 'In Stock', color: 'text-green-600' };
  };

  const handleEnrichProduct = (product: Product) => {
    setSelectedProductForEnrich(product);
    setIsEnrichModalOpen(true);
  };

  const handleApplyEnrichment = async (approvedData: any) => {
    if (!selectedProductForEnrich) return;

    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);

      // Update product with approved data
      const response = await fetch(`/api/products/${selectedProductForEnrich.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
        },
        body: JSON.stringify(approvedData),
      });

      if (response.ok) {
        // Reload products to show updated data
        loadProducts();
        alert('Product enriched successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to update product: ${error.error}`);
      }
    } catch (error) {
      console.error('Error applying enrichment:', error);
      alert('Failed to apply enrichment');
    }
  };

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
              <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + New Product
            </button>
          </div>

          {/* Navigation Tabs */}
          <ProductNavigation />
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded ${
                  viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Type Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {(['ALL', 'INPUT', 'READY_PRODUCT', 'MANUFACTURED', 'MADE_TO_ORDER', 'SERVICE'] as FilterType[]).map(
              (type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filterType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'ALL' ? 'All' : type.replace(/_/g, ' ')}
                </button>
              )
            )}
          </div>
        </div>

        {/* Products Display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product.currentStock, product.minStock);
              return (
                <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                  {/* Product Image */}
                  {product.images && Array.isArray(product.images) && product.images.length > 0 && (
                    <div className="mb-4 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-4">
                    {getProductTypeBadge(product.type)}
                    {product.hasRecipe && (
                      <span className="text-xs text-gray-500">📝 Has Recipe</span>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">SKU: {product.sku}</p>

                  {product.type !== 'INPUT' && product.type !== 'SERVICE' && (
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-600">Stock:</span>
                      <span className={`text-sm font-medium ${stockStatus.color}`}>
                        {product.currentStock} {product.unit}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    {product.type === 'INPUT' ? (
                      <span className="text-sm text-gray-500">Cost: ${product.costPrice?.toFixed(0)}</span>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">${product.unitPrice.toFixed(0)}</span>
                    )}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEnrichProduct(product)}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                        title="Enrich with AI"
                      >
                        ✨ AI
                      </button>
                      <button
                        onClick={() => {
                          alert('Edit functionality coming soon');
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Edit →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.currentStock, product.minStock);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {/* Product Image */}
                          {product.images && Array.isArray(product.images) && product.images.length > 0 ? (
                            <div className="flex-shrink-0 h-12 w-12 rounded-lg overflow-hidden bg-gray-100">
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="h-12 w-12 object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">No img</span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getProductTypeBadge(product.type)}
                      </td>
                      <td className="px-6 py-4">
                        {product.type !== 'INPUT' && product.type !== 'SERVICE' ? (
                          <div>
                            <div className={`text-sm font-medium ${stockStatus.color}`}>
                              {product.currentStock} {product.unit}
                            </div>
                            <div className="text-xs text-gray-500">Min: {product.minStock}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {product.type === 'INPUT' ? (
                          <span className="text-sm text-gray-600">Cost: ${product.costPrice?.toFixed(0)}</span>
                        ) : (
                          <span className="text-sm font-medium text-gray-900">${product.unitPrice.toFixed(0)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleEnrichProduct(product)}
                            className="text-purple-600 hover:text-purple-700 font-medium"
                            title="Enrich with AI"
                          >
                            ✨ AI
                          </button>
                          <button
                            onClick={() => {
                              alert('Edit functionality coming soon');
                            }}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found. Create your first product!</p>
          </div>
        )}
      </main>

      {/* Create Product Modal */}
      <CreateProductModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadProducts();
          setIsCreateModalOpen(false);
        }}
      />

      {/* Product Enrichment Modal */}
      <ProductEnrichmentModal
        isOpen={isEnrichModalOpen}
        onClose={() => {
          setIsEnrichModalOpen(false);
          setSelectedProductForEnrich(null);
        }}
        productId={selectedProductForEnrich?.id}
        productName={selectedProductForEnrich?.name}
        productEan={selectedProductForEnrich?.ean}
        onApprove={handleApplyEnrichment}
      />
    </div>
  );
}
