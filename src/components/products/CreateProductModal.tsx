'use client';

import { useState } from 'react';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ProductType = 'INPUT' | 'READY_PRODUCT' | 'MANUFACTURED' | 'MADE_TO_ORDER' | 'SERVICE';

interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  type: ProductType;
  category: string;
  brand: string;
  unitPrice: string;
  costPrice: string;
  minStock: string;
  maxStock: string;
  unit: string;
  // Platform pricing
  cafePrice: string;
  rappiPrice: string;
  pedidosyaPrice: string;
  uberPrice: string;
}

export default function CreateProductModal({ isOpen, onClose, onSuccess }: CreateProductModalProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    sku: '',
    name: '',
    description: '',
    type: 'INPUT',
    category: '',
    brand: '',
    unitPrice: '',
    costPrice: '',
    minStock: '0',
    maxStock: '',
    unit: 'UNIT',
    cafePrice: '',
    rappiPrice: '',
    pedidosyaPrice: '',
    uberPrice: '',
  });

  const [showPlatformConfig, setShowPlatformConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const productTypes: { value: ProductType; label: string; description: string; icon: string }[] = [
    {
      value: 'INPUT',
      label: 'Input / Ingredient',
      description: 'Raw materials used in recipes (cannot be sold directly)',
      icon: '🥛',
    },
    {
      value: 'READY_PRODUCT',
      label: 'Ready Product',
      description: 'Purchased finished goods ready to sell',
      icon: '🥤',
    },
    {
      value: 'MANUFACTURED',
      label: 'Manufactured',
      description: 'Products made in batches using recipes',
      icon: '🍞',
    },
    {
      value: 'MADE_TO_ORDER',
      label: 'Made to Order',
      description: 'Products made on-the-spot when ordered',
      icon: '☕',
    },
    {
      value: 'SERVICE',
      label: 'Service',
      description: 'Non-physical services',
      icon: '🛎️',
    },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleTypeChange = (type: ProductType) => {
    setFormData((prev) => ({ ...prev, type }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      const user = JSON.parse(userData);

      // Prepare data for API
      const productData = {
        sku: formData.sku,
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        category: formData.category || undefined,
        brand: formData.brand || undefined,
        unitPrice: parseFloat(formData.unitPrice) || 0,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
        minStock: parseInt(formData.minStock) || 0,
        maxStock: formData.maxStock ? parseInt(formData.maxStock) : undefined,
        unit: formData.unit || 'UNIT',
        cafePrice: formData.cafePrice ? parseFloat(formData.cafePrice) : undefined,
        rappiPrice: formData.rappiPrice ? parseFloat(formData.rappiPrice) : undefined,
        pedidosyaPrice: formData.pedidosyaPrice ? parseFloat(formData.pedidosyaPrice) : undefined,
        uberPrice: formData.uberPrice ? parseFloat(formData.uberPrice) : undefined,
        tenantId: user.tenantId,
      };

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product');
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      type: 'INPUT',
      category: '',
      brand: '',
      unitPrice: '',
      costPrice: '',
      minStock: '0',
      maxStock: '',
      unit: 'UNIT',
      cafePrice: '',
      rappiPrice: '',
      pedidosyaPrice: '',
      uberPrice: '',
    });
    setShowPlatformConfig(false);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const needsRecipe = formData.type === 'MANUFACTURED' || formData.type === 'MADE_TO_ORDER';
  const canSell = formData.type !== 'INPUT';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Create New Product</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Product Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Product Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {productTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleTypeChange(type.value)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    formData.type === type.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="font-semibold text-gray-900 mb-1">{type.label}</div>
                  <div className="text-xs text-gray-500">{type.description}</div>
                </button>
              ))}
            </div>
            {needsRecipe && (
              <p className="mt-2 text-sm text-blue-600">
                ℹ️ A default recipe will be created automatically. You can add ingredients after creating the product.
              </p>
            )}
            {formData.type === 'INPUT' && (
              <p className="mt-2 text-sm text-amber-600">
                ⚠️ INPUT products cannot be sold directly. They are used as ingredients in recipes.
              </p>
            )}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Whole Milk 1L"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., MILK-1L"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional product description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Beverages"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Nestlé"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="UNIT">Unit</option>
                <option value="KG">Kilogram</option>
                <option value="G">Gram</option>
                <option value="L">Liter</option>
                <option value="ML">Milliliter</option>
                <option value="BOX">Box</option>
                <option value="PACK">Pack</option>
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost Price {formData.type === 'INPUT' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="number"
                name="costPrice"
                value={formData.costPrice}
                onChange={handleChange}
                required={formData.type === 'INPUT'}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Cost per unit"
              />
            </div>

            {canSell && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="unitPrice"
                  value={formData.unitPrice}
                  onChange={handleChange}
                  required={canSell}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Selling price"
                />
              </div>
            )}
          </div>

          {/* Stock Settings (not for MADE_TO_ORDER or SERVICE) */}
          {formData.type !== 'MADE_TO_ORDER' && formData.type !== 'SERVICE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
                <input
                  type="number"
                  name="minStock"
                  value={formData.minStock}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Minimum stock level"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock</label>
                <input
                  type="number"
                  name="maxStock"
                  value={formData.maxStock}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Maximum stock level"
                />
              </div>
            </div>
          )}

          {/* Platform Configuration (for sellable products) */}
          {canSell && (
            <div>
              <button
                type="button"
                onClick={() => setShowPlatformConfig(!showPlatformConfig)}
                className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                {showPlatformConfig ? '▼' : '▶'} Platform Pricing (Optional)
              </button>

              {showPlatformConfig && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ☕ Café Price
                    </label>
                    <input
                      type="number"
                      name="cafePrice"
                      value={formData.cafePrice}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🛵 Rappi Price
                    </label>
                    <input
                      type="number"
                      name="rappiPrice"
                      value={formData.rappiPrice}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🍕 PedidosYa Price
                    </label>
                    <input
                      type="number"
                      name="pedidosyaPrice"
                      value={formData.pedidosyaPrice}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🚗 Uber Eats Price
                    </label>
                    <input
                      type="number"
                      name="uberPrice"
                      value={formData.uberPrice}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
