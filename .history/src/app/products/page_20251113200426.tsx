'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import CreateProductModal from '@/components/products/CreateProductModal';
import ProductEnrichmentModal from '@/components/products/ProductEnrichmentModal';
import ProductNavigation from '@/components/products/ProductNavigation';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import ExportButton from '@/components/shared/ExportButton';
import apiClient from '@/lib/api-client';

interface Product {
  id: string;
  sku: string;
  ean?: string;
  sourceUrl?: string;
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
  tags?: string[];
  hasRecipe: boolean;
  isActive: boolean;
  menuSection?: string;
  hoy?: boolean;
  cafePrice?: number;
  rappiPrice?: number;
  pedidosyaPrice?: number;
  uberPrice?: number;
  images?: string[];
  variants?: {
    id: string;
    name: string;
    displayName?: string;
    sku?: string | null;
    price?: number | null;
    isDefault: boolean;
  }[];
  // Fields added when variants are expanded
  _isVariant?: boolean;
  _parentId?: string;
  _variantId?: string;
  _variantName?: string;
  _isDefault?: boolean;
}

type ViewMode = 'grid' | 'table';
type FilterType = 'ALL' | 'INPUT' | 'READY_PRODUCT' | 'MANUFACTURED' | 'MADE_TO_ORDER' | 'SERVICE';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showVariantsExpanded, setShowVariantsExpanded] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
  const [isEnrichModalOpen, setIsEnrichModalOpen] = useState(false);
  const [selectedProductForEnrich, setSelectedProductForEnrich] = useState<Product | null>(null);
  const [isCreateFromLinkMode, setIsCreateFromLinkMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t } = useTranslation();

  // Helper function to get translated product type
  const getProductTypeLabel = (type: string) => {
    if (type === 'ALL') return t('filters.all');
    return t(`products.types.${type}`);
  };

  useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        router.push('/login');
      } else {
        loadProducts();
      }
    }
  }, [user, isAuthLoading, router]);

  const loadProducts = async () => {
    try {

      const response = await apiClient.get('/api/products');

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
      } else if (response.status === 401) {
        console.error('Authentication failed. Please configure your API key.');
        // You might want to show a modal or redirect to settings
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  // Selection functions
  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const selectAllProducts = () => {
    const allProductIds = new Set(filteredProducts.map(p => p.id));
    setSelectedProducts(allProductIds);
  };

  const clearSelection = () => {
    setSelectedProducts(new Set());
  };

  // Delete functions
  const handleDeleteProduct = (product: Product) => {
    // If deleting an expanded variant, delete the parent product instead
    if (product._isVariant && product._parentId) {
      const parentProduct = products.find(p => p.id === product._parentId);
      if (parentProduct) {
        setProductToDelete(parentProduct);
        setShowDeleteConfirm(true);
        return;
      }
    }
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  const handleBulkDelete = () => {
    if (selectedProducts.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (productToDelete) {
        // Single product delete
        const response = await apiClient.delete(`/api/products/${productToDelete.id}`);
        if (response.ok) {
          setProducts(products.filter(p => p.id !== productToDelete.id));
          setSelectedProducts(prev => {
            const newSet = new Set(prev);
            newSet.delete(productToDelete.id);
            return newSet;
          });
        }
      } else if (selectedProducts.size > 0) {
        // Bulk delete
        const deletePromises = Array.from(selectedProducts).map(productId =>
          apiClient.delete(`/api/products/${productId}`)
        );
        
        const results = await Promise.allSettled(deletePromises);
        const successfulDeletes = results
          .map((result, index) => ({ result, id: Array.from(selectedProducts)[index] }))
          .filter(({ result }) => result.status === 'fulfilled' && (result.value as Response).ok)
          .map(({ id }) => id);

        if (successfulDeletes.length > 0) {
          setProducts(products.filter(p => !successfulDeletes.includes(p.id)));
          setSelectedProducts(new Set());
        }
      }
    } catch (error) {
      console.error('Error deleting products:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };

  // Expand products with variants into individual variant items
  // Helper function to get the appropriate SKU to display
  const getDisplaySKU = (product: any): string | null => {
    // If showing variants expanded, the product is actually a variant
    if (showVariantsExpanded && product._isVariant) {
      return product.sku; // This is already the variant SKU
    }
    
    // If showing parent products only
    if (!showVariantsExpanded) {
      // If product has variants, don't show parent SKU
      if (product.variants && product.variants.length > 0) {
        return null;
      }
      // If it's a simple product (no variants), show the SKU
      return product.sku;
    }
    
    return product.sku;
  };

  const expandedProducts = showVariantsExpanded
    ? products.flatMap((product) => {
        if (product.variants && product.variants.length > 0) {
          // Create a product entry for each variant
          return product.variants.map((variant) => ({
            ...product,
            id: `${product.id}-variant-${variant.id}`,
            _parentId: product.id,
            _variantId: variant.id,
            name: `${product.name} ${variant.displayName || variant.name}`,
            sku: variant.sku ?? '', // Use empty string if no variant SKU
            unitPrice: variant.price ?? product.unitPrice,
            _isVariant: true,
            _variantName: variant.displayName || variant.name,
            _isDefault: variant.isDefault,
          }));
        }
        return [product];
      })
    : products;

  const filteredProducts = expandedProducts.filter((product) => {
    const matchesType = filterType === 'ALL' || product.type === filterType;
    const matchesSearch =
      searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getProductTypeBadge = (type: string) => {
    const badges = {
      INPUT: { color: 'bg-gray-100 text-gray-800' },
      READY_PRODUCT: { color: 'bg-blue-100 text-blue-800' },
      MANUFACTURED: { color: 'bg-green-100 text-green-800' },
      MADE_TO_ORDER: { color: 'bg-yellow-100 text-yellow-800' },
      SERVICE: { color: 'bg-purple-100 text-purple-800' },
    };

    const badge = badges[type as keyof typeof badges] || { color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {t(`products.types.${type}`)}
      </span>
    );
  };

  const getStockStatus = (currentStock: number, minStock: number) => {
    if (currentStock === 0) return { label: t('products.stockStatus.outOfStock'), color: 'text-red-600' };
    if (currentStock <= minStock) return { label: t('products.stockStatus.lowStock'), color: 'text-yellow-600' };
    return { label: t('products.stockStatus.inStock'), color: 'text-green-600' };
  };

  const handleEditProduct = (product: Product) => {
    // If editing an expanded variant, find and edit the parent product instead
    if (product._isVariant && product._parentId) {
      const parentProduct = products.find(p => p.id === product._parentId);
      if (parentProduct) {
        setSelectedProductForEdit(parentProduct);
        setIsEditModalOpen(true);
        return;
      }
    }
    setSelectedProductForEdit(product);
    setIsEditModalOpen(true);
  };

  const handleEnrichProduct = (product: Product) => {
    // If enriching an expanded variant, enrich the parent product instead
    if (product._isVariant && product._parentId) {
      const parentProduct = products.find(p => p.id === product._parentId);
      if (parentProduct) {
        setSelectedProductForEnrich(parentProduct);
        setIsEnrichModalOpen(true);
        return;
      }
    }
    setSelectedProductForEnrich(product);
    setIsEnrichModalOpen(true);
  };

  const handleApplyEnrichment = async (approvedData: any) => {
    try {
      if (isCreateFromLinkMode) {
        // Create a new product from enriched data
        const generateSKU = (name: string): string => {
          const cleanName = name
            .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .toUpperCase()
            .substring(0, 20); // Limit length

          const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
          return `${cleanName}-${timestamp}`;
        };

        const productData = {
          sku: generateSKU(approvedData.name || 'PRODUCT'),
          name: approvedData.name || 'Unnamed Product',
          description: approvedData.description || '',
          type: approvedData.type || 'READY_PRODUCT',
          category: approvedData.category || '',
          brand: approvedData.brand || '',
          ean: approvedData.ean || null,
          sourceUrl: approvedData.sourceUrl || undefined,
          unitPrice: 0, // Default price, user can update later
          costPrice: null,
          currentStock: 0,
          minStock: 0,
          maxStock: null,
          unit: 'UNIT',
          format: null,
          tags: [],
          images: approvedData.images || [],
          isActive: true,
        };

        const response = await apiClient.post('/api/products', productData);

        if (response.ok) {
          loadProducts();
          alert(`Product "${approvedData.name}" created successfully from URL!`);
          setIsCreateFromLinkMode(false);
        } else {
          const error = await response.json();
          alert(`Failed to create product: ${error.error}`);
        }
      } else {
        // Update existing product with approved data
        if (!selectedProductForEnrich) return;

        const response = await apiClient.put(`/api/products/${selectedProductForEnrich.id}`, approvedData);

        if (response.ok) {
          loadProducts();
          alert('Product enriched successfully!');
        } else {
          const error = await response.json();
          alert(`Failed to update product: ${error.error}`);
        }
      }
    } catch (error) {
      console.error('Error applying enrichment:', error);
      alert('Failed to apply enrichment');
    }
  };

  // Duplicate functions
  const handleDuplicateProduct = async (product: Product) => {
    const newName = prompt(`Enter name for duplicated product:`, `Copy of ${product.name}`);
    if (!newName) return;

    const newSku = prompt(`Enter SKU for duplicated product:`, `${product.sku}-COPY`);
    if (!newSku) return;

    try {
      const response = await apiClient.post(`/api/products/${product.id}/duplicate`, {
        newName,
        newSku,
        duplicateVariants: true,
        duplicateModifiers: true,
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Product duplicated successfully! New product: ${result.data.name}`);
        loadProducts();
      } else {
        const error = await response.json();
        alert(`Failed to duplicate product: ${error.error}`);
      }
    } catch (error) {
      console.error('Error duplicating product:', error);
      alert('Failed to duplicate product');
    }
  };

  const handleBulkDuplicate = async () => {
    if (selectedProducts.size === 0) return;

    const namePrefix = prompt('Enter prefix for duplicated products:', 'Copy of') || 'Copy of';
    
    if (!confirm(`Duplicate ${selectedProducts.size} selected products with prefix "${namePrefix}"?`)) {
      return;
    }

    try {
      const response = await apiClient.post('/api/products/bulk-duplicate', {
        productIds: Array.from(selectedProducts),
        namePrefix,
        duplicateVariants: true,
        duplicateModifiers: true,
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully duplicated ${result.data.totalSuccessful} of ${result.data.totalRequested} products`);
        if (result.data.errors.length > 0) {
          console.error('Duplication errors:', result.data.errors);
        }
        loadProducts();
        clearSelection();
      } else {
        const error = await response.json();
        alert(`Failed to duplicate products: ${error.error}`);
      }
    } catch (error) {
      console.error('Error duplicating products:', error);
      alert('Failed to duplicate products');
    }
  };

  // Create product from link function - Opens enrichment modal
  const handleCreateFromLink = () => {
    setIsCreateFromLinkMode(true);
    setSelectedProductForEnrich(null); // No existing product
    setIsEnrichModalOpen(true);
  };

  if (isAuthLoading) {
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
                ← {t('common.back')}
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{t('products.title')}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <ExportButton 
                endpoint="/api/products/export"
                filename="products-backup"
                variant="secondary"
              />
              <button
                onClick={handleCreateFromLink}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                title="Create product from URL"
              >
                🔗 From Link
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                + {t('products.newProduct')}
              </button>
            </div>
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
                placeholder={t('products.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* View Toggle and Variant Display Toggle */}
            <div className="flex items-center space-x-4">
              {/* Variant Display Toggle */}
              <div className="flex items-center space-x-2 border-r pr-4">
                <span className="text-sm text-gray-600">{t('products.display')}:</span>
                <button
                  onClick={() => setShowVariantsExpanded(false)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    !showVariantsExpanded
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={t('products.showParentsOnly')}
                >
                  {t('products.parents')}
                </button>
                <button
                  onClick={() => setShowVariantsExpanded(true)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    showVariantsExpanded
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={t('products.showAllVariants')}
                >
                  {t('products.allVariants')}
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${
                    viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={t('viewModes.grid')}
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
                  title={t('viewModes.table')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
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
                  {getProductTypeLabel(type)}
                </button>
              )
            )}
          </div>

          {/* Bulk Actions Toolbar */}
          {selectedProducts.size > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedProducts.size} {selectedProducts.size === 1 ? 'product' : 'products'} selected
                </span>
                <button
                  onClick={clearSelection}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleBulkDuplicate}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  📋 Duplicate {selectedProducts.size}
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {isDeleting ? 'Deleting...' : `Delete ${selectedProducts.size}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Products Display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product.currentStock, product.minStock);
              return (
                <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 relative">
                  {/* Selection Checkbox */}
                  <div className="absolute top-3 left-3 z-10">
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => toggleProductSelection(product.id)}
                      className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </div>

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
                      <span className="text-xs text-gray-500">📝 {t('products.hasRecipe')}</span>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
                  {getDisplaySKU(product) && (
                    <p className="text-sm text-gray-500 mb-2">SKU: {getDisplaySKU(product)}</p>
                  )}

                  {/* Variants - Only show when not in expanded view */}
                  {!showVariantsExpanded && product.variants && product.variants.length > 0 && (
                    <div className="space-y-1 mb-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Variants</p>
                      <ul className="space-y-1">
                        {product.variants.map((variant) => (
                          <li
                            key={variant.id}
                            className="text-xs text-gray-600 flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-2 py-1"
                          >
                            <span>
                              {variant.isDefault && <span className="text-blue-600 mr-1">★</span>}
                              {variant.displayName || variant.name}
                              {variant.sku && <span className="text-gray-400 ml-2">({variant.sku})</span>}
                            </span>
                            {variant.price !== null && variant.price !== undefined && (
                              <span className="text-gray-800 font-medium">
                                ${variant.price.toFixed(0)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Tags */}
                  {product.tags && product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {product.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {product.tags.length > 3 && (
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          +{product.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {product.type !== 'INPUT' && product.type !== 'SERVICE' && (
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-600">{t('products.stock')}:</span>
                      <span className={`text-sm font-medium ${stockStatus.color}`}>
                        {product.currentStock} {product.unit}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    {product.type === 'INPUT' ? (
                      <span className="text-sm text-gray-500">{t('products.costPrice')}: ${product.costPrice?.toFixed(0)}</span>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">${product.unitPrice.toFixed(0)}</span>
                    )}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEnrichProduct(product)}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                        title={t('products.enrichWithAI')}
                      >
                        ✨ AI
                      </button>
                      <button
                        onClick={() => handleDuplicateProduct(product)}
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                        title="Duplicate product"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        {t('common.edit')} →
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                        title={t('common.delete')}
                      >
                        🗑️
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAllProducts();
                        } else {
                          clearSelection();
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products.name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products.type')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products.stock')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products.price')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.currentStock, product.minStock);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                          className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                      </td>
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
                            {getDisplaySKU(product) && (
                              <div className="text-sm text-gray-500">{getDisplaySKU(product)}</div>
                            )}
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
                        {product.variants && product.variants.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {product.variants.map((variant) => (
                              <div key={variant.id} className="text-xs text-gray-600 flex items-center justify-between">
                                <span>
                                  {variant.isDefault && <span className="text-blue-600 mr-1">★</span>}
                                  {variant.displayName || variant.name}
                                </span>
                                {variant.price !== null && variant.price !== undefined && (
                                  <span className="text-gray-800 font-medium">
                                    ${variant.price.toFixed(0)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleEnrichProduct(product)}
                            className="text-purple-600 hover:text-purple-700 font-medium"
                            title={t('products.enrichWithAI')}
                          >
                            ✨ AI
                          </button>
                          <button
                            onClick={() => handleDuplicateProduct(product)}
                            className="text-green-600 hover:text-green-700 font-medium"
                            title="Duplicate product"
                          >
                            📋
                          </button>
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="text-red-600 hover:text-red-700 font-medium"
                            title={t('common.delete')}
                          >
                            🗑️
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
            <p className="text-gray-500">{t('products.noProducts')}</p>
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

      {/* Edit Product Modal */}
      <CreateProductModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedProductForEdit(null);
        }}
        onSuccess={() => {
          loadProducts();
          setIsEditModalOpen(false);
          setSelectedProductForEdit(null);
        }}
        onDelete={handleDeleteProduct}
        product={selectedProductForEdit || undefined}
      />

      {/* Product Enrichment Modal */}
      <ProductEnrichmentModal
        isOpen={isEnrichModalOpen}
        onClose={() => {
          setIsEnrichModalOpen(false);
          setSelectedProductForEnrich(null);
          setIsCreateFromLinkMode(false);
        }}
        productId={selectedProductForEnrich?.id}
        productName={selectedProductForEnrich?.name}
        productEan={selectedProductForEnrich?.ean}
        productSourceUrl={selectedProductForEnrich?.sourceUrl}
        onApprove={handleApplyEnrichment}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('products.deleteConfirm')}
            </h3>
            <p className="text-gray-600 mb-6">
              {productToDelete 
                ? `Are you sure you want to delete "${productToDelete.name}"? This action cannot be undone.`
                : `Are you sure you want to delete ${selectedProducts.size} products? This action cannot be undone.`
              }
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg font-medium transition-colors"
              >
                {isDeleting ? 'Deleting...' : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
