'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductNavigation from '@/components/products/ProductNavigation';

interface Product {
  id: string;
  name: string;
  sku: string;
  type: string;
}

interface Recipe {
  id: string;
  name: string;
  totalCost?: number;
}

interface ProductionBatch {
  id: string;
  batchNumber: string;
  recipeId: string;
  productId: string;
  plannedQuantity: number;
  actualQuantity?: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startedAt?: string;
  completedAt?: string;
  ingredientCost?: number;
  laborCost?: number;
  overheadCost?: number;
  totalCost?: number;
  costPerUnit?: number;
  notes?: string;
  createdAt: string;
}

type StatusFilter = 'ALL' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export default function ProductionPage() {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Record<string, Recipe[]>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  // Create batch form
  const [createForm, setCreateForm] = useState({
    productId: '',
    recipeId: '',
    plannedQuantity: 1,
    notes: '',
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);

      // Load production batches
      const batchesResponse = await fetch('/api/production', {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (batchesResponse.ok) {
        const batchesData = await batchesResponse.json();
        setBatches(batchesData);
      }

      // Load MANUFACTURED products
      const productsResponse = await fetch('/api/products?type=MANUFACTURED', {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        const manufacturedProducts = (productsData.data || productsData).filter(
          (p: Product) => p.type === 'MANUFACTURED'
        );
        setProducts(manufacturedProducts);

        // Load recipes for each product
        const recipesMap: Record<string, Recipe[]> = {};
        for (const product of manufacturedProducts) {
          const recipesResponse = await fetch(`/api/recipes?productId=${product.id}`, {
            headers: {
              'x-tenant-id': user.tenantId,
            },
          });
          if (recipesResponse.ok) {
            const recipesData = await recipesResponse.json();
            recipesMap[product.id] = recipesData;
          }
        }
        setRecipes(recipesMap);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async () => {
    if (!createForm.productId || !createForm.recipeId || createForm.plannedQuantity <= 0) {
      alert('Please fill all required fields');
      return;
    }

    setActionLoading(true);
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const response = await fetch('/api/production', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
        },
        body: JSON.stringify(createForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create batch');
      }

      setShowCreateModal(false);
      setCreateForm({
        productId: '',
        recipeId: '',
        plannedQuantity: 1,
        notes: '',
      });
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to create batch');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchAction = async (batchId: string, action: 'start' | 'complete' | 'cancel', data?: any) => {
    setActionLoading(true);
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const response = await fetch(`/api/production/${batchId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} batch`);
      }

      loadData();
    } catch (error: any) {
      alert(error.message || `Failed to ${action} batch`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteBatch = (batchId: string, plannedQty: number) => {
    const actualQuantity = prompt(`Enter actual quantity produced (planned: ${plannedQty}):`, plannedQty.toString());
    if (!actualQuantity) return;

    const laborCost = prompt('Enter labor cost (optional):', '0');
    const overheadCost = prompt('Enter overhead cost (optional):', '0');

    handleBatchAction(batchId, 'complete', {
      actualQuantity: parseInt(actualQuantity),
      laborCost: parseFloat(laborCost || '0'),
      overheadCost: parseFloat(overheadCost || '0'),
    });
  };

  const handleCancelBatch = (batchId: string) => {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;

    handleBatchAction(batchId, 'cancel', { reason });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PLANNED: 'bg-gray-100 text-gray-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || badges.PLANNED;
  };

  const filteredBatches = batches.filter((batch) => {
    return statusFilter === 'ALL' || batch.status === statusFilter;
  });

  const getProductName = (productId: string) => {
    return products.find((p) => p.id === productId)?.name || 'Unknown';
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
              <h1 className="text-2xl font-bold text-gray-900">Production Batches</h1>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + New Batch
            </button>
          </div>
          <ProductNavigation />
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Status Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'ALL' ? 'All Batches' : status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Batches List */}
        {filteredBatches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No production batches found.</p>
            {products.length === 0 && (
              <Link href="/products" className="text-blue-600 hover:text-blue-700">
                Create a MANUFACTURED product first
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBatches.map((batch) => (
              <div key={batch.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getProductName(batch.productId)}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(batch.status)}`}>
                        {batch.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Batch #{batch.batchNumber} • Planned: {batch.plannedQuantity} units
                      {batch.actualQuantity && ` • Produced: ${batch.actualQuantity} units`}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {batch.status === 'PLANNED' && (
                      <button
                        onClick={() => handleBatchAction(batch.id, 'start')}
                        disabled={actionLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:bg-blue-300"
                      >
                        Start Production
                      </button>
                    )}
                    {batch.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleCompleteBatch(batch.id, batch.plannedQuantity)}
                        disabled={actionLoading}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm disabled:bg-green-300"
                      >
                        Complete Batch
                      </button>
                    )}
                    {(batch.status === 'PLANNED' || batch.status === 'IN_PROGRESS') && (
                      <button
                        onClick={() => handleCancelBatch(batch.id)}
                        disabled={actionLoading}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm disabled:bg-red-300"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Batch Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
                  {batch.startedAt && (
                    <div>
                      <div className="text-xs text-gray-500">Started</div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(batch.startedAt).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                  {batch.completedAt && (
                    <div>
                      <div className="text-xs text-gray-500">Completed</div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(batch.completedAt).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                  {batch.totalCost && (
                    <div>
                      <div className="text-xs text-gray-500">Total Cost</div>
                      <div className="text-sm font-medium text-gray-900">${batch.totalCost.toFixed(2)}</div>
                    </div>
                  )}
                  {batch.costPerUnit && (
                    <div>
                      <div className="text-xs text-gray-500">Cost per Unit</div>
                      <div className="text-sm font-medium text-gray-900">${batch.costPerUnit.toFixed(2)}</div>
                    </div>
                  )}
                </div>

                {batch.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">Notes</div>
                    <div className="text-sm text-gray-700">{batch.notes}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Create Production Batch</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.productId}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, productId: e.target.value, recipeId: '' });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select product...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </div>

              {createForm.productId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipe <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.recipeId}
                    onChange={(e) => setCreateForm({ ...createForm, recipeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select recipe...</option>
                    {recipes[createForm.productId]?.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name} {recipe.totalCost && `($${recipe.totalCost.toFixed(2)})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Planned Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={createForm.plannedQuantity}
                  onChange={(e) => setCreateForm({ ...createForm, plannedQuantity: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional production notes"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBatch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                disabled={actionLoading}
              >
                {actionLoading ? 'Creating...' : 'Create Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
