'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import ProductEnrichmentModal from './ProductEnrichmentModal';
import ImageUploader from '../shared/ImageUploader';
import ChannelPricingModal from '../shared/ChannelPricingModal';
import apiClient from '@/lib/api-client';

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  type: ProductType;
  category?: string;
  brand?: string;
  ean?: string;
  unitPrice: number;
  costPrice?: number;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  unit: string;
  images?: string[];
  cafePrice?: number;
  rappiPrice?: number;
  pedidosyaPrice?: number;
  uberPrice?: number;
}

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product; // Optional product for edit mode
}

type ProductType = 'INPUT' | 'READY_PRODUCT' | 'MANUFACTURED' | 'MADE_TO_ORDER' | 'SERVICE';

interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  type: ProductType;
  category: string;
  brand: string;
  ean: string;
  unitPrice: string;
  costPrice: string;
  currentStock: string;
  minStock: string;
  maxStock: string;
  unit: string;
  images: string[];
  // Platform pricing
  cafePrice: string;
  rappiPrice: string;
  pedidosyaPrice: string;
  uberPrice: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  color: string;
  isActive: boolean;
  productCount: number;
}

interface ProductVariant {
  id?: string;
  name: string;
  displayName?: string;
  useCustomName: boolean;
  description?: string;
  price?: number;
  costPrice?: string;
  cafePrice?: string;
  rappiPrice?: string;
  pedidosyaPrice?: string;
  uberPrice?: string;
  minStock?: string;
  maxStock?: string;
  images: string[];
  isDefault: boolean;
}

interface ProductModifier {
  id?: string;
  name: string;
  type: 'ADD' | 'REMOVE';
  priceAdjustment: number;
  cafePriceAdjustment?: string;
  rappiPriceAdjustment?: string;
  pedidosyaPriceAdjustment?: string;
  uberPriceAdjustment?: string;
}

interface ModifierGroup {
  id?: string;
  name: string;
  isRequired: boolean;
  allowMultiple: boolean;
  modifiers: ProductModifier[];
}

export default function CreateProductModal({ isOpen, onClose, onSuccess, product }: CreateProductModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<ProductFormData>({
    sku: '',
    name: '',
    description: '',
    type: 'INPUT',
    category: '',
    brand: '',
    ean: '',
    unitPrice: '',
    costPrice: '',
    currentStock: '0',
    minStock: '0',
    maxStock: '',
    unit: 'UNIT',
    images: [],
    cafePrice: '',
    rappiPrice: '',
    pedidosyaPrice: '',
    uberPrice: '',
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [showVariants, setShowVariants] = useState(false);
  const [showModifiers, setShowModifiers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEnrichModalOpen, setIsEnrichModalOpen] = useState(false);
  const [channelPricingModalOpen, setChannelPricingModalOpen] = useState(false);
  const [currentVariantIndex, setCurrentVariantIndex] = useState<number | null>(null);
  const [expandedVariants, setExpandedVariants] = useState<Set<number>>(new Set());
  const [modifierChannelPricingModalOpen, setModifierChannelPricingModalOpen] = useState(false);
  const [currentModifierIndices, setCurrentModifierIndices] = useState<{ groupIndex: number; modIndex: number } | null>(null);
  const [crossVariantImages, setCrossVariantImages] = useState<string[]>([]);

  // Fetch categories when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Populate form data when editing a product
  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        type: product.type,
        category: product.category || '',
        brand: product.brand || '',
        ean: product.ean || '',
        unitPrice: product.unitPrice.toString(),
        costPrice: product.costPrice?.toString() || '',
        currentStock: product.currentStock.toString(),
        minStock: product.minStock.toString(),
        maxStock: product.maxStock?.toString() || '',
        unit: product.unit,
        images: product.images || [],
        cafePrice: product.cafePrice?.toString() || '',
        rappiPrice: product.rappiPrice?.toString() || '',
        pedidosyaPrice: product.pedidosyaPrice?.toString() || '',
        uberPrice: product.uberPrice?.toString() || '',
      });
    }
  }, [product]);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/api/categories');

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setCategories(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const productTypes: { value: ProductType; label: string; description: string; icon: string }[] = [
    {
      value: 'INPUT',
      label: t('products.types.INPUT'),
      description: t('products.typeDescriptions.INPUT'),
      icon: '🥛',
    },
    {
      value: 'READY_PRODUCT',
      label: t('products.types.READY_PRODUCT'),
      description: t('products.typeDescriptions.READY_PRODUCT'),
      icon: '🥤',
    },
    {
      value: 'MANUFACTURED',
      label: t('products.types.MANUFACTURED'),
      description: t('products.typeDescriptions.MANUFACTURED'),
      icon: '🍞',
    },
    {
      value: 'MADE_TO_ORDER',
      label: t('products.types.MADE_TO_ORDER'),
      description: t('products.typeDescriptions.MADE_TO_ORDER'),
      icon: '☕',
    },
    {
      value: 'SERVICE',
      label: t('products.types.SERVICE'),
      description: t('products.typeDescriptions.SERVICE'),
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

  const handleEnrichmentApprove = (enrichedData: any) => {
    setFormData((prev) => ({
      ...prev,
      name: enrichedData.name || prev.name,
      description: enrichedData.description || prev.description,
      category: enrichedData.category || prev.category,
      brand: enrichedData.brand || prev.brand,
      ean: enrichedData.ean || prev.ean,
      type: enrichedData.type || prev.type,
      images: enrichedData.images || prev.images,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Prepare data for API
      const productData = {
        sku: formData.sku,
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        category: formData.category || undefined,
        brand: formData.brand || undefined,
        ean: formData.ean || undefined,
        unitPrice: parseFloat(formData.unitPrice) || 0,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
        currentStock: parseInt(formData.currentStock) || 0,
        minStock: parseInt(formData.minStock) || 0,
        maxStock: formData.maxStock ? parseInt(formData.maxStock) : undefined,
        unit: formData.unit || 'UNIT',
        images: formData.images.length > 0 ? formData.images : undefined,
        cafePrice: formData.cafePrice ? parseFloat(formData.cafePrice) : undefined,
        rappiPrice: formData.rappiPrice ? parseFloat(formData.rappiPrice) : undefined,
        pedidosyaPrice: formData.pedidosyaPrice ? parseFloat(formData.pedidosyaPrice) : undefined,
        uberPrice: formData.uberPrice ? parseFloat(formData.uberPrice) : undefined,
      };

      let response;
      let productId;

      if (product) {
        // Update existing product
        response = await apiClient.put(`/api/products/${product.id}`, productData);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update product');
        }
        productId = product.id;
      } else {
        // Create new product
        response = await apiClient.post('/api/products', productData);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create product');
        }
        const createdProduct = await response.json();
        productId = createdProduct.id;
      }

      // Create variants if any
      if (variants.length > 0) {
        for (const variant of variants) {
          const variantResponse = await apiClient.post(
            `/api/products/${productId}/variants`,
            variant
          );
          if (!variantResponse.ok) {
            console.error('Failed to create variant:', variant.name);
          }
        }
      }

      // Create modifier groups and modifiers if any
      if (modifierGroups.length > 0) {
        for (const group of modifierGroups) {
          const groupResponse = await apiClient.post(
            `/api/products/${productId}/modifier-groups`,
            group
          );
          if (!groupResponse.ok) {
            console.error('Failed to create modifier group:', group.name);
          }
        }
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || `Failed to ${product ? 'update' : 'create'} product`);
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
      ean: '',
      unitPrice: '',
      costPrice: '',
      currentStock: '0',
      minStock: '0',
      maxStock: '',
      unit: 'UNIT',
      images: [],
      cafePrice: '',
      rappiPrice: '',
      pedidosyaPrice: '',
      uberPrice: '',
    });
    setVariants([]);
    setModifierGroups([]);
    setShowVariants(false);
    setShowModifiers(false);
    setCrossVariantImages([]);
    setError('');
    onClose();
  };

  // Variant management functions
  const addVariant = () => {
    // Smart defaults: pre-populate with product values
    const newVariant: ProductVariant = {
      name: '',
      useCustomName: false,
      description: '',
      price: 0,
      costPrice: formData.costPrice || '',
      cafePrice: formData.cafePrice || '',
      rappiPrice: formData.rappiPrice || '',
      pedidosyaPrice: formData.pedidosyaPrice || '',
      uberPrice: formData.uberPrice || '',
      minStock: formData.minStock || '',
      maxStock: formData.maxStock || '',
      images: [],
      isDefault: variants.length === 0,
    };
    setVariants([...variants, newVariant]);
    // Auto-expand the new variant
    setExpandedVariants(new Set([...expandedVariants, variants.length]));
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    // If setting a variant as default, unset others
    if (field === 'isDefault' && value === true) {
      updated.forEach((v, i) => {
        if (i !== index) v.isDefault = false;
      });
    }
    setVariants(updated);
  };

  const removeVariant = (index: number) => {
    const updated = variants.filter((_, i) => i !== index);
    // If removing the default, set first as default
    if (variants[index].isDefault && updated.length > 0) {
      updated[0].isDefault = true;
    }
    setVariants(updated);
  };

  // Cross-variant image functions
  const applyCrossVariantImages = () => {
    const updatedVariants = variants.map(variant => ({
      ...variant,
      images: [...(variant.images || []), ...crossVariantImages]
    }));
    setVariants(updatedVariants);
  };

  const clearCrossVariantImages = () => {
    setCrossVariantImages([]);
  };

  // Modifier group management functions
  const addModifierGroup = () => {
    setModifierGroups([...modifierGroups, { name: '', isRequired: false, allowMultiple: true, modifiers: [] }]);
  };

  const updateModifierGroup = (index: number, field: keyof ModifierGroup, value: any) => {
    const updated = [...modifierGroups];
    updated[index] = { ...updated[index], [field]: value };
    setModifierGroups(updated);
  };

  const removeModifierGroup = (index: number) => {
    setModifierGroups(modifierGroups.filter((_, i) => i !== index));
  };

  const addModifier = (groupIndex: number) => {
    const updated = [...modifierGroups];
    updated[groupIndex].modifiers.push({ name: '', type: 'ADD', priceAdjustment: 0 });
    setModifierGroups(updated);
  };

  const updateModifier = (groupIndex: number, modIndex: number, field: keyof ProductModifier, value: any) => {
    const updated = [...modifierGroups];
    updated[groupIndex].modifiers[modIndex] = { ...updated[groupIndex].modifiers[modIndex], [field]: value };
    setModifierGroups(updated);
  };

  const removeModifier = (groupIndex: number, modIndex: number) => {
    const updated = [...modifierGroups];
    updated[groupIndex].modifiers = updated[groupIndex].modifiers.filter((_, i) => i !== modIndex);
    setModifierGroups(updated);
  };

  // Helper functions for variants
  const toggleVariantExpansion = (index: number) => {
    const newExpanded = new Set(expandedVariants);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedVariants(newExpanded);
  };

  const openChannelPricingModal = (index: number) => {
    setCurrentVariantIndex(index);
    setChannelPricingModalOpen(true);
  };

  const handleChannelPricingSave = (prices: {
    cafePrice?: string;
    rappiPrice?: string;
    pedidosyaPrice?: string;
    uberPrice?: string;
  }) => {
    if (currentVariantIndex !== null) {
      // Update variant pricing
      const updated = [...variants];
      updated[currentVariantIndex] = {
        ...updated[currentVariantIndex],
        cafePrice: prices.cafePrice,
        rappiPrice: prices.rappiPrice,
        pedidosyaPrice: prices.pedidosyaPrice,
        uberPrice: prices.uberPrice,
      };
      setVariants(updated);
    } else {
      // Update product-level pricing
      setFormData(prev => ({
        ...prev,
        cafePrice: prices.cafePrice || '',
        rappiPrice: prices.rappiPrice || '',
        pedidosyaPrice: prices.pedidosyaPrice || '',
        uberPrice: prices.uberPrice || '',
      }));
    }
  };

  // Auto-generate variant display name
  const getVariantDisplayName = (variant: ProductVariant) => {
    if (variant.useCustomName && variant.displayName) {
      return variant.displayName;
    }
    return variant.name ? `${formData.name} ${variant.name}` : formData.name;
  };

  // Modifier channel pricing handlers
  const openModifierChannelPricingModal = (groupIndex: number, modIndex: number) => {
    setCurrentModifierIndices({ groupIndex, modIndex });
    setModifierChannelPricingModalOpen(true);
  };

  const handleModifierChannelPricingSave = (prices: {
    cafePrice?: string;
    rappiPrice?: string;
    pedidosyaPrice?: string;
    uberPrice?: string;
  }) => {
    if (currentModifierIndices !== null) {
      const { groupIndex, modIndex } = currentModifierIndices;
      const updated = [...modifierGroups];
      updated[groupIndex].modifiers[modIndex] = {
        ...updated[groupIndex].modifiers[modIndex],
        cafePriceAdjustment: prices.cafePrice,
        rappiPriceAdjustment: prices.rappiPrice,
        pedidosyaPriceAdjustment: prices.pedidosyaPrice,
        uberPriceAdjustment: prices.uberPrice,
      };
      setModifierGroups(updated);
    }
  };

  if (!isOpen) return null;

  const needsRecipe = formData.type === 'MANUFACTURED' || formData.type === 'MADE_TO_ORDER';
  const canSell = formData.type !== 'INPUT';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {product ? t('products.editProduct') : t('products.createProduct')}
          </h2>
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
            {t('products.type')} <span className="text-red-500">*</span>
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
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">{type.icon}</span>
                  <span className="font-medium">{type.label}</span>
                </div>
                <p className="text-sm text-gray-600">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

          {/* AI Product Enrichment */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-purple-900 flex items-center">
                  {t('products.aiEnrichmentTitle')}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t('products.aiEnrichmentDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEnrichModalOpen(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                ✨ {t('products.enrichWithAI')}
              </button>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
{t('products.name')} <span className="text-red-500">*</span>
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
                {t('products.sku')} <span className="text-red-500">*</span>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.description')}</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('products.description')}
            />
          </div>

          {/* Product Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('products.images')}</label>
            <ImageUploader
              images={formData.images}
              onImagesChange={(images) => setFormData(prev => ({ ...prev, images }))}
              maxImages={5}
              label={t('products.images')}
            />
          </div>

          {/* Cross-Variant Images */}
          {canSell && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-blue-900">
                  📸 {t('variants.crossVariantImages')}
                </label>
                <div className="flex space-x-2">
                  {crossVariantImages.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={applyCrossVariantImages}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                      >
                        {t('variants.applyToAllVariants')} ({variants.length})
                      </button>
                      <button
                        type="button"
                        onClick={clearCrossVariantImages}
                        className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                      >
                        {t('variants.clear')}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-blue-700 mb-3">
                {t('variants.crossVariantImagesDesc')}
              </p>
              <ImageUploader
                images={crossVariantImages}
                onImagesChange={setCrossVariantImages}
                maxImages={3}
                label={t('variants.crossVariantImages')}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.category')}</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('forms.selectOption')}...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.emoji} {cat.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  {t('categories.noCategories')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.brand')}</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.ean')}</label>
              <input
                type="text"
                name="ean"
                value={formData.ean}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 7791234567890"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.unit')}</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="UNIT">{t('products.units.UNIT')}</option>
              <option value="KG">{t('products.units.KG')}</option>
              <option value="G">{t('products.units.G')}</option>
              <option value="L">{t('products.units.L')}</option>
              <option value="ML">{t('products.units.ML')}</option>
              <option value="BOX">{t('products.units.BOX')}</option>
              <option value="PACK">{t('products.units.PACK')}</option>
            </select>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
{t('products.costPrice')} {formData.type === 'INPUT' && <span className="text-red-500">*</span>}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.currentStock')}</label>
                <input
                  type="number"
                  name="currentStock"
                  value={formData.currentStock}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Current inventory"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.minStock')}</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.maxStock')}</label>
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

          {/* Channel-Specific Pricing Button (for sellable products) */}
          {canSell && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Channel-Specific Pricing</h3>
                <p className="text-sm text-gray-600">Set different prices for each delivery platform</p>
                {(formData.cafePrice || formData.rappiPrice || formData.pedidosyaPrice || formData.uberPrice) && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Custom channel prices configured
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setCurrentVariantIndex(null);
                  setChannelPricingModalOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Set Channel Prices
              </button>
            </div>
          )}

          {/* Product Variants (for sellable products) */}
          {canSell && (
            <div>
              <button
                type="button"
                onClick={() => setShowVariants(!showVariants)}
                className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                {showVariants ? '▼' : '▶'} Product Variants (Optional)
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Add size or flavor variations (e.g., Small/Medium/Large, Strawberry/Mango)
              </p>

              {showVariants && (
                <div className="mt-4 space-y-3">
                  {variants.map((variant, index) => {
                    const isExpanded = expandedVariants.has(index);
                    const displayName = getVariantDisplayName(variant);

                    return (
                      <div key={index} className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                        {/* Variant Header */}
                        <div className="p-4 bg-gray-50 flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              type="button"
                              onClick={() => toggleVariantExpansion(index)}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                            <div>
                              <div className="font-medium text-gray-900">
                                {displayName || 'New Variant'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {variant.isDefault && <span className="text-blue-600 font-medium">DEFAULT • </span>}
                                {variant.price && variant.price > 0 && `Price: $${variant.price}`}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            className="text-red-500 hover:text-red-700 p-2"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Variant Details */}
                        {isExpanded && (
                          <div className="p-4 space-y-4">
                            {/* Variant Name */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Variant Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={variant.name}
                                onChange={(e) => updateVariant(index, 'name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Small, Strawberry"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Final name: <span className="font-medium">{displayName}</span>
                              </p>
                            </div>

                            {/* Custom Name Override */}
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                id={`custom-name-${index}`}
                                checked={variant.useCustomName}
                                onChange={(e) => updateVariant(index, 'useCustomName', e.target.checked)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <label htmlFor={`custom-name-${index}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                                  Use custom name instead
                                </label>
                                {variant.useCustomName && (
                                  <input
                                    type="text"
                                    value={variant.displayName || ''}
                                    onChange={(e) => updateVariant(index, 'displayName', e.target.value)}
                                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Fresa Deluxe"
                                  />
                                )}
                              </div>
                            </div>

                            {/* Variant Description */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Variant Description
                              </label>
                              <textarea
                                value={variant.description || ''}
                                onChange={(e) => updateVariant(index, 'description', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Specific details about this variant"
                              />
                            </div>

                            {/* Variant Images */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('variants.variantImages')} ({t('common.optional')})
                              </label>
                              <ImageUploader
                                images={variant.images}
                                onImagesChange={(images) => updateVariant(index, 'images', images)}
                                maxImages={4}
                                label={t('variants.variantImages')}
                              />
                            </div>

                            {/* Pricing Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Price
                                </label>
                                <input
                                  type="number"
                                  value={variant.price || ''}
                                  onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="0"
                                  step="0.01"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {t('products.costPrice')}
                                </label>
                                <input
                                  type="number"
                                  value={variant.costPrice || ''}
                                  onChange={(e) => updateVariant(index, 'costPrice', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder={formData.costPrice || '0'}
                                  step="0.01"
                                />
                              </div>
                            </div>

                            {/* Channel Pricing Button */}
                            <div>
                              <button
                                type="button"
                                onClick={() => openChannelPricingModal(index)}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                              >
                                <span className="text-lg">🌐</span>
                                Channel-Specific Pricing
                              </button>
                              {(variant.cafePrice || variant.rappiPrice || variant.pedidosyaPrice || variant.uberPrice) && (
                                <p className="text-xs text-green-600 mt-1">
                                  ✓ Custom channel prices configured
                                </p>
                              )}
                            </div>

                            {/* Advanced Inventory Management */}
                            <details className="border border-gray-300 rounded-lg">
                              <summary className="px-4 py-2 bg-gray-50 cursor-pointer font-medium text-sm text-gray-700 hover:bg-gray-100">
                                Advanced Inventory Management
                              </summary>
                              <div className="p-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Min Stock
                                    </label>
                                    <input
                                      type="number"
                                      value={variant.minStock || ''}
                                      onChange={(e) => updateVariant(index, 'minStock', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                      placeholder={formData.minStock || '0'}
                                      min="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Max Stock
                                    </label>
                                    <input
                                      type="number"
                                      value={variant.maxStock || ''}
                                      onChange={(e) => updateVariant(index, 'maxStock', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                      placeholder={formData.maxStock || ''}
                                      min="0"
                                    />
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                  Leave empty to use product-level inventory settings
                                </p>
                              </div>
                            </details>

                            {/* Default Checkbox */}
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`default-${index}`}
                                checked={variant.isDefault}
                                onChange={(e) => updateVariant(index, 'isDefault', e.target.checked)}
                                className="mr-2"
                              />
                              <label htmlFor={`default-${index}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                                Set as default variant
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={addVariant}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
                  >
                    + Add Variant
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Product Modifiers (for sellable products) */}
          {canSell && (
            <div>
              <button
                type="button"
                onClick={() => setShowModifiers(!showModifiers)}
                className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                {showModifiers ? '▼' : '▶'} Add-ons & Removals (Optional)
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Configure add-ons (e.g., Extra shot, Coconut milk) and removals (e.g., No ice, No sugar)
              </p>

              {showModifiers && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                  {modifierGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="bg-white p-4 rounded border space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Group Name *
                          </label>
                          <input
                            type="text"
                            value={group.name}
                            onChange={(e) => updateModifierGroup(groupIndex, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="e.g., Milk Options, Ice Options"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeModifierGroup(groupIndex)}
                          className="text-red-500 hover:text-red-700 mt-6"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="flex gap-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={group.isRequired}
                            onChange={(e) => updateModifierGroup(groupIndex, 'isRequired', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">Required</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={group.allowMultiple}
                            onChange={(e) => updateModifierGroup(groupIndex, 'allowMultiple', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">Allow Multiple</span>
                        </label>
                      </div>

                      {/* Modifiers in this group */}
                      <div className="ml-4 space-y-2">
                        <div className="text-sm font-medium text-gray-700">Modifiers:</div>
                        {group.modifiers.map((modifier, modIndex) => (
                          <div key={modIndex} className="bg-gray-50 p-3 rounded border border-gray-200 space-y-2">
                            <div className="flex gap-2 items-start">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  value={modifier.name}
                                  onChange={(e) => updateModifier(groupIndex, modIndex, 'name', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="Modifier name"
                                />
                                <select
                                  value={modifier.type}
                                  onChange={(e) => updateModifier(groupIndex, modIndex, 'type', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  <option value="ADD">Add-on (+)</option>
                                  <option value="REMOVE">Removal (-)</option>
                                </select>
                                <input
                                  type="number"
                                  value={modifier.priceAdjustment}
                                  onChange={(e) => updateModifier(groupIndex, modIndex, 'priceAdjustment', parseFloat(e.target.value))}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="Price adjustment"
                                  step="0.01"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeModifier(groupIndex, modIndex)}
                                className="text-red-500 hover:text-red-700 text-sm mt-1"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openModifierChannelPricingModal(groupIndex, modIndex)}
                                className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-100"
                              >
                                <span>🌐</span>
                                Channel Pricing
                              </button>
                              {(modifier.cafePriceAdjustment || modifier.rappiPriceAdjustment ||
                                modifier.pedidosyaPriceAdjustment || modifier.uberPriceAdjustment) && (
                                <span className="text-xs text-green-600">
                                  ✓ Custom prices set
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addModifier(groupIndex)}
                          className="w-full px-3 py-1 border border-dashed border-gray-300 rounded text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600"
                        >
                          + Add Modifier
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addModifierGroup}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                  >
                    + Add Modifier Group
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Product Images */}
          {formData.images.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('products.images')}</label>
              <div className="grid grid-cols-4 gap-3">
                {formData.images.map((imageUrl, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                    <img
                      src={imageUrl}
                      alt={`Product ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200?text=Error';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== index)
                        }));
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
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

      {/* AI Enrichment Modal */}
      <ProductEnrichmentModal
        isOpen={isEnrichModalOpen}
        onClose={() => setIsEnrichModalOpen(false)}
        productName={formData.name}
        productEan={formData.ean}
        onApprove={handleEnrichmentApprove}
      />

      {/* Channel Pricing Modal for Products and Variants */}
      <ChannelPricingModal
        isOpen={channelPricingModalOpen}
        onClose={() => setChannelPricingModalOpen(false)}
        onSave={handleChannelPricingSave}
        initialPrices={{
          cafePrice: currentVariantIndex !== null 
            ? variants[currentVariantIndex]?.cafePrice
            : formData.cafePrice,
          rappiPrice: currentVariantIndex !== null 
            ? variants[currentVariantIndex]?.rappiPrice
            : formData.rappiPrice,
          pedidosyaPrice: currentVariantIndex !== null 
            ? variants[currentVariantIndex]?.pedidosyaPrice
            : formData.pedidosyaPrice,
          uberPrice: currentVariantIndex !== null 
            ? variants[currentVariantIndex]?.uberPrice
            : formData.uberPrice,
        }}
        title={currentVariantIndex !== null ? "Variant Channel Pricing" : "Product Channel Pricing"}
      />

      {/* Channel Pricing Modal for Modifiers */}
      {currentModifierIndices !== null && (
        <ChannelPricingModal
          isOpen={modifierChannelPricingModalOpen}
          onClose={() => setModifierChannelPricingModalOpen(false)}
          onSave={handleModifierChannelPricingSave}
          initialPrices={{
            cafePrice: modifierGroups[currentModifierIndices.groupIndex]?.modifiers[currentModifierIndices.modIndex]?.cafePriceAdjustment,
            rappiPrice: modifierGroups[currentModifierIndices.groupIndex]?.modifiers[currentModifierIndices.modIndex]?.rappiPriceAdjustment,
            pedidosyaPrice: modifierGroups[currentModifierIndices.groupIndex]?.modifiers[currentModifierIndices.modIndex]?.pedidosyaPriceAdjustment,
            uberPrice: modifierGroups[currentModifierIndices.groupIndex]?.modifiers[currentModifierIndices.modIndex]?.uberPriceAdjustment,
          }}
          title="Modifier Channel Pricing Adjustments"
          isPriceAdjustment={true}
        />
      )}
    </div>
  );
}
