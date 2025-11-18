'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import ProductEnrichmentModal from './ProductEnrichmentModal';
import ImageUploader from '../shared/ImageUploader';
import StructuredImageUploader from '../shared/StructuredImageUploader';
import ChannelPricingModal from '../shared/ChannelPricingModal';
import apiClient from '@/lib/api-client';
import { ProductImages, normalizeProductImages } from '@/types/product-images';

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  shortDescription?: string;
  type: ProductType;
  category?: string;
  brand?: string;
  ean?: string;
  sourceUrl?: string; // Product source URL
  unitPrice: number;
  costPrice?: number;
  currentStock: number;
  format?: string;
  tags?: string[];
  minStock: number;
  maxStock?: number;
  unit: string;
  hasRecipe: boolean;
  isActive: boolean;
  menuSection?: string;
  hoy?: boolean;
  images?: string[];
  cafePrice?: number;
  rappiPrice?: number;
  pedidosyaPrice?: number;
  uberPrice?: number;
  variants?: any[]; // Variants data from API
}

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDelete?: (product: Product) => void; // Optional delete callback for edit mode
  product?: Product; // Optional product for edit mode
  initialData?: Partial<ProductFormData> | null;
}

type ProductType = 'INPUT' | 'READY_PRODUCT' | 'MANUFACTURED' | 'MADE_TO_ORDER' | 'SERVICE';

export interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  shortDescription: string;
  type: ProductType;
  category: string;
  brand: string;
  ean: string;
  sourceUrl: string; // Product source URL for AI enrichment
  unitPrice: string;
  costPrice: string;
  currentStock: string;
  minStock: string;
  maxStock: string;
  unit: string;
  format: string;
  tags: string[];
  images: ProductImages; // Structured images with photos and icons
  // Platform pricing
  cafePrice: string;
  rappiPrice: string;
  pedidosyaPrice: string;
  uberPrice: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  emoji: string;
  color: string;
  format?: string;
  isActive: boolean;
  productCount: number;
}

interface ProductVariant {
  id?: string;
  sku: string;
  name: string;
  displayName: string;
  useCustomName: boolean;
  description: string;
  sourceUrl: string;
  price: number;
  costPrice: string;
  cafePrice: string;
  rappiPrice: string;
  pedidosyaPrice: string;
  uberPrice: string;
  minStock: string;
  maxStock: string;
  images: ProductImages; // Structured images with photos and icons
  tags: string[];
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

export default function CreateProductModal({ isOpen, onClose, onSuccess, onDelete, product, initialData }: CreateProductModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<ProductFormData>({
    sku: '',
    name: '',
    description: '',
    shortDescription: '',
    type: 'INPUT',
    category: '',
    brand: '',
    ean: '',
    sourceUrl: '',
    unitPrice: '',
    costPrice: '',
    currentStock: '0',
    minStock: '0',
    maxStock: '',
    unit: 'UNIT',
    format: '',
    tags: [],
    images: { photos: [], icons: [] },
    cafePrice: '',
    rappiPrice: '',
    pedidosyaPrice: '',
    uberPrice: '',
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [originalVariants, setOriginalVariants] = useState<ProductVariant[]>([]); // Track original variants for deletion
  const [variantsToDelete, setVariantsToDelete] = useState<string[]>([]); // Track variant IDs to delete
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [showVariants, setShowVariants] = useState(false);
  const [showModifiers, setShowModifiers] = useState(false);
  const [willHaveVariants, setWillHaveVariants] = useState(false);
  const [expandedVariants, setExpandedVariants] = useState<Set<number>>(new Set());
  const [crossVariantImages, setCrossVariantImages] = useState<ProductImages>({ photos: [], icons: [] });
  const [isEnrichModalOpen, setIsEnrichModalOpen] = useState(false);
  const [channelPricingModalOpen, setChannelPricingModalOpen] = useState(false);
  const [modifierChannelPricingModalOpen, setModifierChannelPricingModalOpen] = useState(false);
  const [currentModifierIndices, setCurrentModifierIndices] = useState<{ groupIndex: number; modIndex: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        shortDescription: product.shortDescription || '',
        type: product.type,
        category: product.category || '',
        brand: product.brand || '',
        ean: product.ean || '',
        sourceUrl: product.sourceUrl || '',
        unitPrice: product.unitPrice.toString(),
        costPrice: product.costPrice?.toString() || '',
        currentStock: product.currentStock.toString(),
        minStock: product.minStock.toString(),
        maxStock: product.maxStock?.toString() || '',
        unit: product.unit,
        format: product.format || '',
        tags: product.tags || [],
        images: { photos: [], icons: [] },
        cafePrice: product.cafePrice?.toString() || '',
        rappiPrice: product.rappiPrice?.toString() || '',
        pedidosyaPrice: product.pedidosyaPrice?.toString() || '',
        uberPrice: product.uberPrice?.toString() || '',
      });

      // Set cross-variant images from product images (with backward compatibility)
      setCrossVariantImages(normalizeProductImages(product.images));

      // Load variants if product has them
      if (product.variants && product.variants.length > 0) {
        setWillHaveVariants(true);
        setShowVariants(true);

        // Transform API variants to form variants
        const formVariants: ProductVariant[] = product.variants.map(v => ({
          id: v.id,
          sku: v.sku || '',
          name: v.name,
          displayName: v.displayName || '',
          useCustomName: !!v.displayName,
          description: v.description || '',
          sourceUrl: v.sourceUrl || '',
          price: v.price || 0,
          costPrice: v.costPrice?.toString() || '',
          cafePrice: v.cafePrice?.toString() || '',
          rappiPrice: v.rappiPrice?.toString() || '',
          pedidosyaPrice: v.pedidosyaPrice?.toString() || '',
          uberPrice: v.uberPrice?.toString() || '',
          minStock: v.minStock?.toString() || '',
          maxStock: v.maxStock?.toString() || '',
          images: normalizeProductImages(v.images), // Migrate legacy format
          tags: (v as any).tags || [], // Use product tags as fallback for now
          isDefault: v.isDefault || false,
        }));

        setVariants(formVariants);
        setOriginalVariants(formVariants); // Store original variants for comparison

        // Keep variants collapsed by default when editing for easier recognition
        setExpandedVariants(new Set());
      } else {
        setWillHaveVariants(false);
        setShowVariants(false);
        setVariants([]);
      }
    }
  }, [product]);

  // Apply initial data when creating new products (e.g., from AI enrichment)
  useEffect(() => {
    if (!product && initialData) {
      const normalizedImages = initialData.images
        ? normalizeProductImages(initialData.images)
        : undefined;

      setFormData(prev => ({
        ...prev,
        ...initialData,
        tags: initialData.tags ?? prev.tags,
        images: normalizedImages ?? prev.images,
      }));

      if (normalizedImages && (normalizedImages.photos?.length || normalizedImages.icons?.length)) {
        setCrossVariantImages(normalizedImages);
      }
    }
  }, [initialData, product]);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/api/categories');

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setCategories(result.data);
        }
      } else {
        console.error('Failed to fetch categories:', response.status, response.statusText);
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

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryName = e.target.value;
    const selectedCategory = categories.find(cat => cat.name === categoryName);
    setFormData(prev => ({
      ...prev,
      category: categoryName,
      // Auto-populate format from category if available
      format: selectedCategory?.format || prev.format,
    }));
    setError('');
  };

  // SKU Generation Helper
  const generateSKU = (brand: string, format: string, productName: string, variant?: string) => {
    const cleanText = (text: string) => {
      return text
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '') // Remove spaces
        .substring(0, 4); // Limit to 4 characters
    };

    const brandCode = brand ? cleanText(brand) : 'PROD';
    const formatCode = format ? {
      'PACKAGED': 'PKG',
      'FROZEN': 'FRZ', 
      'FRESH': 'FRS'
    }[format] || format.substring(0, 3).toUpperCase() : '';
    
    const productCode = productName ? cleanText(productName) : '';
    const variantCode = variant ? cleanText(variant) : '';

    // Build SKU: BRAND-FORMAT-PRODUCT-VARIANT
    const parts = [brandCode, formatCode, productCode, variantCode].filter(Boolean);
    return parts.join('-');
  };

  const suggestSKU = () => {
    const suggestedSKU = generateSKU(
      formData.brand,
      formData.format,
      formData.name,
      variants.length > 0 ? variants[0]?.name : undefined
    );
    
    setFormData(prev => ({ ...prev, sku: suggestedSKU }));
  };

  const suggestVariantSKU = (variantIndex: number) => {
    const variant = variants[variantIndex];
    const suggestedSKU = generateSKU(
      formData.brand,
      formData.format,
      formData.name,
      variant.name
    );
    
    updateVariant(variantIndex, 'sku', suggestedSKU);
  };

  const handleTypeChange = (type: ProductType) => {
    setFormData((prev) => ({ ...prev, type }));
    setError('');
  };

  const handleEnrichmentApprove = (enrichedData: any) => {
    // Only allow AI to suggest predefined tags (etiquetas conocidas)
    const predefinedTagsObj = t('products.predefinedTags') as any;
    const predefinedTagKeys = Object.keys(predefinedTagsObj || {});

    const aiTags = Array.isArray(enrichedData.tags)
      ? enrichedData.tags.filter((tag: string) => predefinedTagKeys.includes(tag))
      : [];

    setFormData((prev) => ({
      ...prev,
      name: enrichedData.name || prev.name,
      description: enrichedData.description || prev.description,
      shortDescription: enrichedData.shortDescription || prev.shortDescription,
      category: enrichedData.category || prev.category,
      brand: enrichedData.brand || prev.brand,
      ean: enrichedData.ean || prev.ean,
      type: enrichedData.type || prev.type,
      format: enrichedData.format || prev.format,
      // Merge AI tags with existing ones, keeping only predefined tags
      tags:
        aiTags.length > 0
          ? Array.from(new Set([...prev.tags, ...aiTags]))
          : prev.tags,
      images: enrichedData.images ? normalizeProductImages(enrichedData.images) : prev.images,
      sourceUrl: enrichedData.sourceUrl || prev.sourceUrl,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Starting product creation/update...');
      console.log('willHaveVariants:', willHaveVariants);
      console.log('formData:', formData);

      // Derive pricing based on product structure
      const parsedUnitPrice = parseFloat(formData.unitPrice);
      const parsedCostPrice = formData.costPrice ? parseFloat(formData.costPrice) : undefined;
      let derivedUnitPrice = Number.isFinite(parsedUnitPrice) ? parsedUnitPrice : 0;
      let derivedCostPrice = Number.isFinite(parsedCostPrice) ? parsedCostPrice : undefined;

      if (willHaveVariants) {
        if (variants.length === 0) {
          setError('Please add at least one variant before creating the product.');
          setLoading(false);
          return;
        }

        const defaultVariant = variants.find(variant => variant.isDefault) || variants[0];
        const variantPrice = Number(defaultVariant?.price);
        derivedUnitPrice = Number.isFinite(variantPrice) ? variantPrice : 0;

        if (defaultVariant?.costPrice !== undefined) {
          const variantCost = parseFloat(defaultVariant.costPrice);
          if (Number.isFinite(variantCost)) {
            derivedCostPrice = variantCost;
          }
        }

        console.log('Derived unit price from variants:', derivedUnitPrice);
      }

      // Prepare data for API
      const productData = {
        sku: willHaveVariants ? `${formData.name.replace(/\s+/g, '-').toUpperCase()}-PARENT` : formData.sku,
        name: formData.name,
        description: formData.description || undefined,
        shortDescription: formData.shortDescription || undefined,
        type: formData.type,
        category: formData.category || undefined,
        brand: formData.brand || undefined,
        ean: formData.ean || undefined,
        sourceUrl: formData.sourceUrl || undefined,
        unitPrice: derivedUnitPrice,
        costPrice: derivedCostPrice,
        currentStock: parseInt(formData.currentStock) || 0,
        minStock: parseInt(formData.minStock) || 0,
        maxStock: formData.maxStock ? parseInt(formData.maxStock) : undefined,
        unit: formData.unit || 'UNIT',
        format: formData.format || undefined,
        tags: formData.tags.length > 0 ? formData.tags : [],
        images: (crossVariantImages.photos?.length || crossVariantImages.icons?.length) ? crossVariantImages : undefined,
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
        console.log('Creating new product with data:', productData);
        response = await apiClient.post('/api/products', productData);
        console.log('Product creation response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Product creation failed:', errorData);
          throw new Error(errorData.error || 'Failed to create product');
        }
        const createdProduct = await response.json();
        console.log('Product created successfully:', createdProduct);
        productId = createdProduct.data?.id || createdProduct.id;
      }

      // Handle variants: delete marked variants first
      if (variantsToDelete.length > 0) {
        console.log('Deleting marked variants:', variantsToDelete);
        for (const variantId of variantsToDelete) {
          const deleteResponse = await apiClient.delete(`/api/variants/${variantId}`);
          if (!deleteResponse.ok) {
            console.error('Failed to delete variant:', variantId);
          } else {
            console.log('Successfully deleted variant:', variantId);
          }
        }
      }

      // Create or update current variants
      if (variants.length > 0) {
        for (const variant of variants) {
          let variantResponse;
          
          if (variant.id) {
            // Update existing variant
            console.log('Updating existing variant:', variant.id, variant.name);
            variantResponse = await apiClient.put(
              `/api/variants/${variant.id}`,
              variant
            );
          } else {
            // Create new variant
            console.log('Creating new variant:', variant.name);
            variantResponse = await apiClient.post(
              `/api/products/${productId}/variants`,
              variant
            );
          }
          
          if (!variantResponse.ok) {
            console.error(`Failed to ${variant.id ? 'update' : 'create'} variant:`, variant.name);
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

      console.log('Product creation/update completed successfully');
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Product creation/update error:', err);
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
      shortDescription: '',
      type: 'INPUT',
      category: '',
      brand: '',
      ean: '',
      sourceUrl: '',
      unitPrice: '',
      costPrice: '',
      currentStock: '0',
      minStock: '0',
      maxStock: '',
      unit: 'UNIT',
      format: '',
      tags: [],
      images: { photos: [], icons: [] },
      cafePrice: '',
      rappiPrice: '',
      pedidosyaPrice: '',
      uberPrice: '',
    });
    setVariants([]);
    setOriginalVariants([]);
    setVariantsToDelete([]);
    setModifierGroups([]);
    setShowVariants(false);
    setShowModifiers(false);
    setCrossVariantImages({ photos: [], icons: [] });
    setError('');
    onClose();
  };

  // Variant management functions
  const addVariant = () => {
    // Smart defaults: if variants exist, use the last variant's values; otherwise use product values
    const lastVariant = variants.length > 0 ? variants[variants.length - 1] : null;

    const newVariant: ProductVariant = {
      name: '',
      sku: '',
      displayName: '',
      useCustomName: false,
      description: '',
      sourceUrl: '',
      price: 0,
      costPrice: '',
      cafePrice: '',
      rappiPrice: '',
      pedidosyaPrice: '',
      uberPrice: '',
      minStock: '0',
      maxStock: '',
      images: { photos: [], icons: [] },
      tags: [], // Initialize with empty tags
      isDefault: variants.length === 0, // First variant is default
    };
    setVariants([...variants, newVariant]);
    // Auto-expand the new variant
    setExpandedVariants(new Set([...expandedVariants, variants.length]));
  };

  const duplicateVariant = (index: number) => {
    const sourceVariant = variants[index];
    const newVariant: ProductVariant = {
      ...sourceVariant,
      id: undefined, // Clear ID for new variant
      name: `${sourceVariant.name} - Copy`,
      sku: '', // Clear SKU, user will need to set a unique one
      isDefault: false, // Copy is never default
      images: {
        photos: [...(sourceVariant.images.photos || [])],
        icons: [...(sourceVariant.images.icons || [])],
      }, // Deep copy structured images
    };
    setVariants([...variants, newVariant]);
    // Auto-expand the duplicated variant
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
    const variantToRemove = variants[index];
    
    // If the variant has an ID, mark it for deletion
    if (variantToRemove.id) {
      setVariantsToDelete(prev => [...prev, variantToRemove.id!]);
      console.log('Marking variant for deletion:', variantToRemove.id, variantToRemove.name);
    }
    
    const updated = variants.filter((_, i) => i !== index);
    setVariants(updated);
  };

  // Cross-variant image functions
  const applyCrossVariantImages = () => {
    const updatedVariants = variants.map(variant => ({
      ...variant,
      images: {
        photos: [...(variant.images.photos || []), ...(crossVariantImages.photos || [])],
        icons: [...(variant.images.icons || []), ...(crossVariantImages.icons || [])],
      }
    }));
    setVariants(updatedVariants);
  };

  const clearCrossVariantImages = () => {
    setCrossVariantImages({ photos: [], icons: [] });
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

  const handleChannelPricingSave = (prices: {
    cafePrice?: string;
    rappiPrice?: string;
    pedidosyaPrice?: string;
    uberPrice?: string;
  }) => {
    setFormData(prev => ({
      ...prev,
      cafePrice: prices.cafePrice || '',
      rappiPrice: prices.rappiPrice || '',
      pedidosyaPrice: prices.pedidosyaPrice || '',
      uberPrice: prices.uberPrice || '',
    }));
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
                    ? 'border-blue-600 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
                }`}
              >
                <div className="flex items-center mb-2">
                  <span
                    className={`text-2xl mr-2 ${
                      formData.type === type.value ? 'text-blue-600' : 'text-gray-500'
                    }`}
                  >
                    {type.icon}
                  </span>
                  <span
                    className={`font-semibold ${
                      formData.type === type.value ? 'text-blue-900' : 'text-gray-800'
                    }`}
                  >
                    {type.label}
                  </span>
                </div>
                <p
                  className={`text-sm ${
                    formData.type === type.value ? 'text-blue-700' : 'text-gray-600'
                  }`}
                >
                  {type.description}
                </p>
              </button>
            ))}
          </div>
        </div>

          {/* Variant Toggle - Only for sellable products */}
          {canSell && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{t('products.structure.title')}</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('products.structure.description')}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="variantChoice"
                      checked={!willHaveVariants}
                      onChange={() => {
                        setWillHaveVariants(false);
                        setShowVariants(false);
                        setVariants([]);
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{t('products.structure.single')}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="variantChoice"
                      checked={willHaveVariants}
                      onChange={() => {
                        setWillHaveVariants(true);
                        setShowVariants(true);
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{t('products.structure.variants')}</span>
                  </label>
                </div>
              </div>
            </div>
          )}

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
                placeholder={t('products.namePlaceholder')}
              />
            </div>

            {/* SKU - Hidden when user chooses to have variants */}
            {!willHaveVariants && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.sku')} <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    required={!willHaveVariants}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('products.skuPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={suggestSKU}
                    disabled={!formData.name}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                    title={t('products.suggestSKU')}
                  >
                    🔧 {t('products.suggestSKU')}
                  </button>
                </div>
                {!formData.name && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 {t('products.skuSuggestionHint', { field: t('products.name') })}
                  </p>
                )}
              </div>
            )}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Description <span className="text-gray-500 text-xs">(Optional, for menus)</span>
            </label>
            <textarea
              name="shortDescription"
              value={formData.shortDescription}
              onChange={handleChange}
              rows={2}
              maxLength={150}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description for display in menus (max 150 characters)"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.shortDescription.length}/150 characters
            </p>
          </div>

          {/* Cross-Variant Images */}
          {canSell && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-blue-900">
                  📸 {t('variants.crossVariantImages')}
                </label>
                <div className="flex space-x-2">
                  {crossVariantImages && ((crossVariantImages.photos && crossVariantImages.photos.length > 0) || (crossVariantImages.icons && crossVariantImages.icons.length > 0)) && (
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
              <StructuredImageUploader
                images={crossVariantImages}
                onImagesChange={setCrossVariantImages}
                maxPhotos={3}
                maxIcons={2}
                label={t('variants.crossVariantImages')}
                showIcons={true}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.category')}</label>
              <select
                name="category"
                value={formData.category}
                onChange={(e) => {
                  const selectedCategory = categories.find((cat) => cat.name === e.target.value);
                  if (selectedCategory) {
                    setFormData((prev) => ({ 
                      ...prev, 
                      category: selectedCategory.name, 
                      format: selectedCategory.format || prev.format 
                    }));
                  } else {
                    setFormData((prev) => ({ ...prev, category: e.target.value }));
                  }
                }}
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
                placeholder={t('products.brandPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product URL <span className="text-gray-500 text-xs">(Optional, for AI enrichment)</span>
              </label>
              <input
                type="url"
                name="sourceUrl"
                value={formData.sourceUrl}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="https://example.com/product/lasana-vegetariana"
              />
              <p className="mt-1 text-xs text-gray-500">
                💡 Link to producer's website or social media post for better AI enrichment
              </p>
            </div>

            {/* EAN - Hidden when user chooses to have variants */}
            {!willHaveVariants && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.ean')}</label>
                <input
                  type="text"
                  name="ean"
                  value={formData.ean}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('products.eanPlaceholder')}
                />
              </div>
            )}
          </div>

          {/* Info message when user chooses variants */}
          {willHaveVariants && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    {t('products.variantNotice.title')}
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>{t('products.variantNotice.description')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.format')}</label>
              <select
                name="format"
                value={formData.format}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('common.select')}</option>
                <option value="PACKAGED">{t('products.formats.PACKAGED')}</option>
                <option value="FROZEN">{t('products.formats.FROZEN')}</option>
                <option value="FRESH">{t('products.formats.FRESH')}</option>
              </select>
            </div>
          </div>

          {/* Tags - Hidden when product has variants */}
          {!willHaveVariants && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('products.tags')}</label>
            <div className="space-y-3">
              {/* Predefined Tags */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Common Tags:</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(t('products.predefinedTags')).map(([key, label]) => {
                    // If Vegano is selected, hide Vegetariano as it is implied
                    if (key === 'vegetariano' && formData.tags.includes('vegano')) {
                      return null;
                    }

                    const isSelected = formData.tags.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          // Special behavior: Vegano implies Vegetariano
                          if (key === 'vegano') {
                            if (isSelected) {
                              setFormData(prev => ({
                                ...prev,
                                tags: prev.tags.filter(tag => tag !== 'vegano')
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                tags: [
                                  ...prev.tags.filter(tag => tag !== 'vegetariano'),
                                  'vegano',
                                ],
                              }));
                            }
                          } else {
                            if (isSelected) {
                              setFormData(prev => ({
                                ...prev,
                                tags: prev.tags.filter(tag => tag !== key)
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                tags: [...prev.tags, key]
                              }));
                            }
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Tags */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Custom Tags:</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags
                    .filter(tag => !Object.keys(t('products.predefinedTags')).includes(tag))
                    .map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-300"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              tags: prev.tags.filter(t => t !== tag)
                            }));
                          }}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('products.addTagPlaceholder')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.target as HTMLInputElement;
                        const newTag = input.value.trim();
                        if (newTag && !formData.tags.includes(newTag)) {
                          setFormData(prev => ({
                            ...prev,
                            tags: [...prev.tags, newTag]
                          }));
                          input.value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      const input = (e.target as HTMLButtonElement).previousElementSibling as HTMLInputElement;
                      const newTag = input.value.trim();
                      if (newTag && !formData.tags.includes(newTag)) {
                        setFormData(prev => ({
                          ...prev,
                          tags: [...prev.tags, newTag]
                        }));
                        input.value = '';
                      }
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    {t('products.addTag')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Pricing - Hidden when user chooses variants */}
          {!willHaveVariants && (
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
                  placeholder={t('products.costPricePlaceholder')}
                />
              </div>

              {canSell && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('products.unitPrice')} <span className="text-red-500">*</span>
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
                    placeholder={t('products.unitPricePlaceholder')}
                  />
                </div>
              )}
            </div>
          )}

          {/* Stock Settings (not for MADE_TO_ORDER or SERVICE) */}
          {/* Stock Settings - Hidden when user chooses variants */}
          {formData.type !== 'MADE_TO_ORDER' && formData.type !== 'SERVICE' && !willHaveVariants && (
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
                  placeholder={t('products.currentStockPlaceholder')}
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
                  placeholder={t('products.minStockPlaceholder')}
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
                  placeholder={t('products.maxStockPlaceholder')}
                />
              </div>
            </div>
          )}

          {/* Channel-Specific Pricing Button (for sellable products) */}
          {canSell && !willHaveVariants && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">{t('variants.channelPricing')}</h3>
                <p className="text-sm text-gray-600">{t('products.channelPricingDescription')}</p>
                {(formData.cafePrice || formData.rappiPrice || formData.pedidosyaPrice || formData.uberPrice) && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {t('modals.customChannelPrices')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setChannelPricingModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                {t('modals.setChannelPrices')}
              </button>
            </div>
          )}

          {/* Product Variants (shown when user chooses to have variants) */}
          {canSell && willHaveVariants && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{t('variants.title')}</h3>
                  <p className="text-sm text-gray-600">
                    {t('variants.description')}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {variants.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-500 mb-4">{t('variants.noVariants')}</p>
                    <button
                      type="button"
                      onClick={addVariant}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {t('variants.addFirstVariant')}
                    </button>
                  </div>
                )}

                {variants.length > 0 && (
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
                                {displayName || t('variants.newVariant')}
                              </div>
                              <div className="text-xs text-gray-500">
                                {variant.isDefault && <span className="text-blue-600 font-medium">{t('variants.defaultIndicator')} • </span>}
                                {variant.price && variant.price > 0 && t('variants.priceSummary', { price: variant.price })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => duplicateVariant(index)}
                              className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded transition-colors"
                              title={t('variants.duplicateTooltip')}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeVariant(index)}
                              className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                              title={t('variants.removeTooltip')}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Variant Details */}
                        {isExpanded && (
                          <div className="p-4 space-y-4">
                            {/* Variant Name */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('variants.variantName')} <span className="text-red-500">*</span>
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={variant.name}
                                  onChange={(e) => updateVariant(index, 'name', e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder={t('variants.namePlaceholder')}
                                />
                                <button
                                  type="button"
                                  onClick={() => suggestVariantSKU(index)}
                                  disabled={!formData.name || !variant.name}
                                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                                  title={t('variants.suggestSkuTooltip')}
                                >
                                  🔧 {t('variants.suggestButton')}
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {t('variants.nameHelper')}
                              </p>
                            </div>

                            {/* Variant SKU */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('variants.variantSKU')}
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={variant.sku || ''}
                                  onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder={t('variants.skuPlaceholder')}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const suggestedSKU = generateSKU(
                                      formData.brand,
                                      formData.format,
                                      formData.name,
                                      variant.name
                                    );
                                    updateVariant(index, 'sku', suggestedSKU);
                                  }}
                                  disabled={!formData.name || !variant.name}
                                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                                  title={t('variants.suggestSkuTooltip')}
                                >
                                  🔧 {t('variants.suggestButton')}
                                </button>
                              </div>
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
                                  {t('variants.useCustomName')}
                                </label>
                                {variant.useCustomName && (
                                  <input
                                    type="text"
                                    value={variant.displayName || ''}
                                    onChange={(e) => updateVariant(index, 'displayName', e.target.value)}
                                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder={t('variants.customNamePlaceholder')}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Variant Description */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700">
                                  {t('variants.variantDescription')}
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Set the variant name and description for AI enrichment
                                    setIsEnrichModalOpen(true);
                                    // You could pass variant-specific data here if needed
                                  }}
                                  className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-xs font-medium transition-colors"
                                  title={t('variants.aiEnhanceTooltip')}
                                >
                                  {t('variants.aiEnhanceButton')}
                                </button>
                              </div>
                              <textarea
                                value={variant.description || ''}
                                onChange={(e) => updateVariant(index, 'description', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder={t('variants.descriptionPlaceholder')}
                              />
                            </div>

                            {/* Variant Images */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('variants.variantImages')} ({t('common.optional')})
                              </label>
                              <StructuredImageUploader
                                images={variant.images}
                                onImagesChange={(images) => updateVariant(index, 'images', images)}
                                maxPhotos={4}
                                maxIcons={2}
                                label={t('variants.variantImages')}
                                showIcons={true}
                              />
                            </div>

                            {/* Variant Tags */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('products.tags')}
                              </label>
                              <div className="space-y-3">
                                {/* Predefined Tags */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-2">Common Tags:</label>
                                  <div className="flex flex-wrap gap-2">
                                    {Object.entries(t('products.predefinedTags')).map(([key, label]) => {
                                      // If Vegano is selected for this variant, hide Vegetariano
                                      if (key === 'vegetariano' && variant.tags.includes('vegano')) {
                                        return null;
                                      }

                                      const isSelected = variant.tags.includes(key);
                                      return (
                                        <button
                                          key={key}
                                          type="button"
                                          onClick={() => {
                                            if (key === 'vegano') {
                                              if (isSelected) {
                                                updateVariant(
                                                  index,
                                                  'tags',
                                                  variant.tags.filter(tag => tag !== 'vegano')
                                                );
                                              } else {
                                                updateVariant(
                                                  index,
                                                  'tags',
                                                  [
                                                    ...variant.tags.filter(tag => tag !== 'vegetariano'),
                                                    'vegano',
                                                  ]
                                                );
                                              }
                                            } else {
                                              if (isSelected) {
                                                updateVariant(index, 'tags', variant.tags.filter(tag => tag !== key));
                                              } else {
                                                updateVariant(index, 'tags', [...variant.tags, key]);
                                              }
                                            }
                                          }}
                                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                            isSelected
                                              ? 'bg-blue-600 text-white'
                                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                          }`}
                                        >
                                          {label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Custom Tags */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-2">Custom Tags:</label>
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {variant.tags
                                      .filter(tag => !Object.keys(t('products.predefinedTags')).includes(tag))
                                      .map((tag, tagIndex) => (
                                        <span
                                          key={tagIndex}
                                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                                        >
                                          {tag}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              updateVariant(index, 'tags', variant.tags.filter(t => t !== tag));
                                            }}
                                            className="ml-2 text-blue-600 hover:text-blue-800"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      ))}
                                  </div>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder={t('products.addCustomTag')}
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const input = e.target as HTMLInputElement;
                                          const newTag = input.value.trim();
                                          if (newTag && !variant.tags.includes(newTag)) {
                                            updateVariant(index, 'tags', [...variant.tags, newTag]);
                                            input.value = '';
                                          }
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        const input = (e.target as HTMLButtonElement).previousElementSibling as HTMLInputElement;
                                        const newTag = input.value.trim();
                                        if (newTag && !variant.tags.includes(newTag)) {
                                          updateVariant(index, 'tags', [...variant.tags, newTag]);
                                          input.value = '';
                                        }
                                      }}
                                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                    >
                                      {t('products.addTag')}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Pricing Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {t('products.price')}
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

                            {/* Note: Current stock is managed at product level, not variant level */}

                            {/* Advanced Inventory Management */}
                            <details className="border border-gray-300 rounded-lg">
                              <summary className="px-4 py-2 bg-gray-50 cursor-pointer font-medium text-sm text-gray-700 hover:bg-gray-100">
                                {t('variants.advancedInventory')}
                              </summary>
                              <div className="p-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      {t('products.minStock')}
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
                                      {t('products.maxStock')}
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
                                  {t('variants.leaveEmptyHint')}
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
                              <label htmlFor={`default-${index}`} className="text-sm text-gray-600 cursor-pointer">
                                {t('variants.markAsDefault')} <span className="text-gray-400">({t('common.optional')})</span>
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
                    + {t('variants.addVariant')}
                  </button>
                </div>
                )}
              </div>
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
                {showModifiers ? '▼' : '▶'} {t('modifierGroups.titleOptional')}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                {t('modifierGroups.description')}
              </p>

              {showModifiers && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                  {modifierGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="bg-white p-4 rounded border space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {t('modifierGroups.groupName')} *
                          </label>
                          <input
                            type="text"
                            value={group.name}
                            onChange={(e) => updateModifierGroup(groupIndex, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder={t('modifierGroups.groupPlaceholder')}
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
                          <span className="text-sm">{t('modifierGroups.required')}</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={group.allowMultiple}
                            onChange={(e) => updateModifierGroup(groupIndex, 'allowMultiple', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">{t('modifierGroups.allowMultiple')}</span>
                        </label>
                      </div>

                      {/* Modifiers in this group */}
                      <div className="ml-4 space-y-2">
                        <div className="text-sm font-medium text-gray-700">{t('modifierGroups.modifiers')}</div>
                        {group.modifiers.map((modifier, modIndex) => (
                          <div key={modIndex} className="bg-gray-50 p-3 rounded border border-gray-200 space-y-2">
                            <div className="flex gap-2 items-start">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  value={modifier.name}
                                  onChange={(e) => updateModifier(groupIndex, modIndex, 'name', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder={t('modifierGroups.modifierNamePlaceholder')}
                                />
                                <select
                                  value={modifier.type}
                                  onChange={(e) => updateModifier(groupIndex, modIndex, 'type', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  <option value="ADD">{t('modifierGroups.addOption')}</option>
                                  <option value="REMOVE">{t('modifierGroups.removeOption')}</option>
                                </select>
                                <input
                                  type="number"
                                  value={modifier.priceAdjustment}
                                  onChange={(e) => updateModifier(groupIndex, modIndex, 'priceAdjustment', parseFloat(e.target.value))}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder={t('modifierGroups.priceAdjustmentPlaceholder')}
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
                                {t('modals.channelPricing')}
                              </button>
                              {(modifier.cafePriceAdjustment || modifier.rappiPriceAdjustment ||
                                modifier.pedidosyaPriceAdjustment || modifier.uberPriceAdjustment) && (
                                <span className="text-xs text-green-600">
                                  ✓ {t('modals.customChannelPrices')}
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
                          + {t('modifierGroups.addModifier')}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addModifierGroup}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                  >
                    + {t('modifierGroups.addModifierGroup')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Product Images - Only shown if there are any images */}
          {((formData.images.photos && formData.images.photos.length > 0) ||
            (formData.images.icons && formData.images.icons.length > 0)) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('products.images')}</label>
              <div className="grid grid-cols-4 gap-3">
                {/* Render photos */}
                {formData.images.photos?.map((imageUrl, index) => (
                  <div key={`photo-${index}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                    <img
                      src={imageUrl}
                      alt={`Product Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const fallback =
                          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="%236b7280">Sin imagen</text></svg>';
                        const img = e.target as HTMLImageElement;
                        if (img.src !== fallback) {
                          img.src = fallback;
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          images: {
                            ...prev.images,
                            photos: prev.images.photos?.filter((_, i) => i !== index) || []
                          }
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
                {/* Render icons */}
                {formData.images.icons?.map((imageUrl, index) => (
                  <div key={`icon-${index}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-blue-200 bg-white p-2">
                    <img
                      src={imageUrl}
                      alt={`Product Icon ${index + 1}`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const fallback =
                          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="%236b7280">Sin icono</text></svg>';
                        const img = e.target as HTMLImageElement;
                        if (img.src !== fallback) {
                          img.src = fallback;
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          images: {
                            ...prev.images,
                            icons: prev.images.icons?.filter((_, i) => i !== index) || []
                          }
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
          <div className="flex justify-between pt-4 border-t border-gray-200">
            {/* Delete Button (Edit Mode Only) */}
            {product && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(product);
                  handleClose();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300"
                disabled={loading}
              >
                🗑️ {t('common.delete')}
              </button>
            )}
            
            {/* Right Side Actions */}
            <div className="flex space-x-3 ml-auto">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                disabled={loading}
              >
                {loading ? (product ? t('common.updating') : t('common.creating')) : (product ? t('common.update') : t('common.create'))}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* AI Enrichment Modal */}
      <ProductEnrichmentModal
        isOpen={isEnrichModalOpen}
        onClose={() => setIsEnrichModalOpen(false)}
        productName={formData.name}
        productEan={formData.ean}
        productSourceUrl={formData.sourceUrl}
        productType={formData.type}
        productDescription={formData.description}
        variantNames={variants.map(variant => variant.name).filter(Boolean)}
        onApprove={handleEnrichmentApprove}
      />

      {/* Channel Pricing Modal for Products and Variants */}
      <ChannelPricingModal
        isOpen={channelPricingModalOpen}
        onClose={() => setChannelPricingModalOpen(false)}
        onSave={handleChannelPricingSave}
        initialPrices={{
          cafePrice: formData.cafePrice,
          rappiPrice: formData.rappiPrice,
          pedidosyaPrice: formData.pedidosyaPrice,
          uberPrice: formData.uberPrice,
        }}
        title={t('modals.productChannelPricing')}
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
          title={t('modals.modifierChannelPricing')}
          isPriceAdjustment={true}
        />
      )}
    </div>
  );
}
