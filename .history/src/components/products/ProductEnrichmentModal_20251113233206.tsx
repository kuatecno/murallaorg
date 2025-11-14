'use client';

import React, { useState } from 'react';
import { X, Check, Loader2, Sparkles, AlertCircle } from 'lucide-react';

const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="16" fill="%236b7280">Imagen no disponible</text></svg>';

const DISALLOWED_IMAGE_HOSTS = new Set([
  'opengraph.githubassets.com',
  'avatars.githubusercontent.com',
]);

const sanitizeImageUrls = (urls?: string[]): string[] => {
  if (!urls) return [];

  const seen = new Set<string>();

  return urls.reduce<string[]>((acc, url) => {
    if (acc.length >= 20) {
      return acc;
    }

    if (!url) return acc;
    const trimmedUrl = url.trim();

    if (!trimmedUrl.startsWith('https://')) {
      return acc;
    }

    try {
      const { hostname } = new URL(trimmedUrl);
      if (DISALLOWED_IMAGE_HOSTS.has(hostname.toLowerCase())) {
        return acc;
      }
    } catch (error) {
      return acc;
    }

    if (seen.has(trimmedUrl)) {
      return acc;
    }

    seen.add(trimmedUrl);
    acc.push(trimmedUrl);
    return acc;
  }, []);
};

interface EnrichmentSuggestion {
  name?: string;
  description?: string;
  category?: string;
  brand?: string;
  ean?: string;
  type?: string;
  images?: string[];
  sourceUrl?: string;
}

interface FieldMetadata {
  value: any;
  source: 'gemini' | 'openai' | 'google_search' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
}

interface EnrichmentResponse {
  suggestions: EnrichmentSuggestion;
  currentData: any;
  metadata?: {
    [key: string]: FieldMetadata;
  };
  enrichmentMethod?: 'standard' | 'web_extraction' | 'grounded';
  sources?: {
    googleImagesByName?: number;
    googleImagesByBarcode?: number;
    gemini?: boolean;
    openai?: boolean;
    totalImages?: number;
  };
  grounding?: {
    searchQueriesUsed?: string[];
    sourcesFound?: number;
    sourceUrls?: string[];
    verified?: boolean;
  };
  cost?: number;
}

interface ProductEnrichmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  productName?: string;
  productEan?: string;
  productSourceUrl?: string; // Product source URL from database
  productType?: string; // Product type (INPUT, READY_PRODUCT, etc.)
  productDescription?: string; // Current description from product/form
  variantNames?: string[];
  onApprove: (approvedData: Partial<EnrichmentSuggestion>) => void;
}

interface FieldApproval {
  [key: string]: boolean;
}

export default function ProductEnrichmentModal({
  isOpen,
  onClose,
  productId,
  productName,
  productEan,
  productSourceUrl,
  productType,
  productDescription,
  variantNames,
  onApprove,
}: ProductEnrichmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingMoreImages, setLoadingMoreImages] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<EnrichmentSuggestion | null>(null);
  const [currentData, setCurrentData] = useState<any>(null);
  const [imageSources, setImageSources] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [enrichmentMethod, setEnrichmentMethod] = useState<string>('standard');
  const [groundingInfo, setGroundingInfo] = useState<any>(null);
  const [approvals, setApprovals] = useState<FieldApproval>({});
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [cloudinaryUrls, setCloudinaryUrls] = useState<Map<string, string>>(new Map());
  const [sourceUrl, setSourceUrl] = useState<string>(productSourceUrl || ''); // Manual URL input, pre-filled from product
  const [rewrites, setRewrites] = useState<{ gemini?: string; openai?: string } | null>(null);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [descriptionsByMethod, setDescriptionsByMethod] = useState<{
    standard?: string;
    web_extraction?: string;
    grounded?: string;
  }>({});

  const canUseWebSearch = productType === 'INPUT' || productType === 'READY_PRODUCT';

  const fetchRewrites = async () => {
    setRewriteLoading(true);
    setError(null);

    try {
      const baseDescription =
        suggestions?.description || currentData?.description || productDescription;

      if (!baseDescription || baseDescription.trim() === '') {
        throw new Error('No description available to rewrite');
      }

      const response = await fetch('/api/products/rewrite-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName,
          productType,
          description: baseDescription,
        }),
      });

      setDescriptionsByMethod(prev => ({
        ...prev,
        web_extraction: data.suggestions.description || prev.web_extraction,
      }));

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rewrite description');
      }

      const data = await response.json();
      setRewrites(data.rewrites || null);

    } catch (err: any) {
      console.error('Description rewrite error:', err);
      setError(err.message || 'Failed to rewrite description');
    } finally {
      setRewriteLoading(false);
    }
  };

  const applyRewrite = (source: 'gemini' | 'openai') => {
    if (!rewrites) return;
    const newDescription = rewrites[source];
    if (!newDescription) return;

    setSuggestions(prev => ({
      ...(prev || {}),
      description: newDescription,
    }));

    setApprovals(prev => ({
      ...prev,
      description: true,
    }));
  };

  const fetchEnrichment = async () => {
    setLoading(true);
    setError(null);

    try {
      const userData = localStorage.getItem('user');
      if (!userData) throw new Error('User not authenticated');

      const user = JSON.parse(userData);

      const response = await fetch('/api/products/enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
        },
        body: JSON.stringify({
          productId,
          name: productName || undefined,
          ean: productEan || undefined,
          tenantId: user.tenantId,
          variantNames,
          sourceUrl: sourceUrl || undefined, // Include optional source URL
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to enrich product';

        // Add helpful context for URL-only enrichment failures
        if (!productName && !productEan && sourceUrl) {
          throw new Error(`${errorMessage}\n\nTip: Make sure the URL is publicly accessible. The AI will extract product name, description, and other data from the webpage.`);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      const sanitizedSuggestions: EnrichmentSuggestion = {
        ...data.suggestions,
        images: sanitizeImageUrls(data.suggestions.images),
      };

      setSuggestions(sanitizedSuggestions);
      setCurrentData(data.currentData);
      setImageSources(data.sources);
      setMetadata(data.metadata);
      setEnrichmentMethod(data.enrichmentMethod || 'standard');
      setGroundingInfo(data.grounding);

      setDescriptionsByMethod(prev => ({
        ...prev,
        standard: sanitizedSuggestions.description || prev.standard,
      }));

      // Initialize all fields as approved by default
      const initialApprovals: FieldApproval = {};
      Object.keys(data.suggestions).forEach(key => {
        if (key !== 'images') {
          initialApprovals[key] = true;
        }
      });
      setApprovals(initialApprovals);

      // Auto-select first image if available
      if (sanitizedSuggestions.images && sanitizedSuggestions.images.length > 0) {
        setSelectedImages([sanitizedSuggestions.images[0]]);
      }

    } catch (err: any) {
      console.error('Enrichment error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    if (!suggestions) return;

    const approvedData: Partial<EnrichmentSuggestion> = {};

    Object.entries(approvals).forEach(([field, approved]) => {
      if (approved && suggestions[field as keyof EnrichmentSuggestion]) {
        approvedData[field as keyof EnrichmentSuggestion] =
          suggestions[field as keyof EnrichmentSuggestion] as any;
      }
    });

    // Add approved images - use Cloudinary URLs if available
    if (selectedImages.length > 0) {
      approvedData.images = selectedImages.map(originalUrl =>
        cloudinaryUrls.get(originalUrl) || originalUrl
      );
    }

    if (sourceUrl) {
      (approvedData as any).sourceUrl = sourceUrl;
    }

    onApprove(approvedData);
    handleClose();
  };

  const handleClose = () => {
    setSuggestions(null);
    setCurrentData(null);
    setApprovals({});
    setSelectedImages([]);
    setError(null);
    onClose();
  };

  const toggleApproval = (field: string) => {
    setApprovals(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const toggleImageSelection = async (imageUrl: string) => {
    const isSelected = selectedImages.includes(imageUrl);

    if (isSelected) {
      // Deselect
      setSelectedImages(prev => prev.filter(url => url !== imageUrl));
    } else {
      // Select and upload to Cloudinary
      setSelectedImages(prev => [...prev, imageUrl]);

      // Upload to Cloudinary in background
      if (!cloudinaryUrls.has(imageUrl)) {
        setUploadingImages(prev => new Set(prev).add(imageUrl));

        try {
          const response = await fetch('/api/cloudinary/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl,
              productName: suggestions?.name || productName,
              folder: 'products',
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setCloudinaryUrls(prev => new Map(prev).set(imageUrl, data.cloudinaryUrl));
            console.log('✅ Image uploaded to Cloudinary:', data.cloudinaryUrl);
          }
        } catch (error) {
          console.error('Failed to upload to Cloudinary:', error);
        } finally {
          setUploadingImages(prev => {
            const newSet = new Set(prev);
            newSet.delete(imageUrl);
            return newSet;
          });
        }
      }
    }
  };

  const fetchWebExtraction = async () => {
    setLoading(true);
    setError(null);

    try {
      const userData = localStorage.getItem('user');
      if (!userData) throw new Error('User not authenticated');

      const user = JSON.parse(userData);

      const response = await fetch('/api/products/extract-web-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
        },
        body: JSON.stringify({
          productName: productName || suggestions?.name,
          productEan: productEan || suggestions?.ean,
          productBrand: suggestions?.brand,
          tenantId: user.tenantId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract web metadata');
      }

      const data = await response.json();
      const sanitizedImages = sanitizeImageUrls(data.suggestions.images);

      setSuggestions(prev => {
        const nextSuggestions = { ...prev, ...data.suggestions } as EnrichmentSuggestion;

        if (data.suggestions.images) {
          nextSuggestions.images = sanitizedImages;
        } else if (prev?.images) {
          nextSuggestions.images = prev.images;
        }

        return nextSuggestions;
      });
      setMetadata(data.metadata);
      setEnrichmentMethod('web_extraction');

      // Re-initialize approvals
      const initialApprovals: FieldApproval = {};
      Object.keys(data.suggestions).forEach(key => {
        if (key !== 'images') {
          initialApprovals[key] = true;
        }
      });
      setApprovals(initialApprovals);

    } catch (err: any) {
      console.error('Web extraction error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroundedEnrichment = async () => {
    setLoading(true);
    setError(null);

    try {
      const userData = localStorage.getItem('user');
      if (!userData) throw new Error('User not authenticated');

      const user = JSON.parse(userData);

      const response = await fetch('/api/products/enrich-grounded', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
        },
        body: JSON.stringify({
          productName: productName || suggestions?.name,
          productEan: productEan || suggestions?.ean,
          productBrand: suggestions?.brand,
          tenantId: user.tenantId,
          sourceUrl: sourceUrl || undefined, // Include optional source URL
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to perform grounded enrichment');
      }

      const data = await response.json();
      const sanitizedImages = sanitizeImageUrls(data.suggestions.images);

      setSuggestions(prev => {
        const nextSuggestions = { ...prev, ...data.suggestions } as EnrichmentSuggestion;

        if (data.suggestions.images) {
          nextSuggestions.images = sanitizedImages;
        } else if (prev?.images) {
          nextSuggestions.images = prev.images;
        }

        return nextSuggestions;
      });
      setMetadata(data.metadata);
      setEnrichmentMethod('grounded');
      setGroundingInfo(data.grounding);

      // Re-initialize approvals
      const initialApprovals: FieldApproval = {};
      Object.keys(data.suggestions).forEach(key => {
        if (key !== 'images') {
          initialApprovals[key] = true;
        }
      });
      setApprovals(initialApprovals);

    } catch (err: any) {
      console.error('Grounded enrichment error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreImages = async () => {
    setLoadingMoreImages(true);
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);

      const response = await fetch('/api/products/enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
        },
        body: JSON.stringify({
          productId,
          name: productName,
          ean: productEan,
          tenantId: user.tenantId,
          variantNames,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.suggestions.images) {
          const sanitizedImages = sanitizeImageUrls(data.suggestions.images);

          // Merge new images with existing ones (avoiding duplicates)
          setSuggestions(prev => ({
            ...prev!,
            images: [
              ...(prev?.images || []),
              ...sanitizedImages.filter((img: string) => !prev?.images?.includes(img))
            ],
          }));

          // Update image sources for new images
          if (data.sources) {
            setImageSources((prev: any) => ({
              googleImagesByName: (prev?.googleImagesByName || 0) + (data.sources.googleImagesByName || 0),
              googleImagesByBarcode: (prev?.googleImagesByBarcode || 0) + (data.sources.googleImagesByBarcode || 0),
              gemini: prev?.gemini || data.sources.gemini,
              openai: prev?.openai || data.sources.openai,
              totalImages: (prev?.totalImages || 0) + (data.sources.totalImages || 0),
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching more images:', error);
    } finally {
      setLoadingMoreImages(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-6 h-6" />
            <h2 className="text-xl font-bold">AI Product Enrichment</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {!suggestions && !loading && (
            <div className="py-8">
              <Sparkles className="w-16 h-16 mx-auto text-blue-500 mb-4" />
              <p className="text-gray-600 mb-6 text-center">
                {productName || productEan
                  ? 'Click the button below to generate AI-powered suggestions for this product'
                  : 'Enter a product URL to extract and enrich product data with AI'}
              </p>

              {/* Source URL Input - Required when no product name/EAN */}
              <div className="max-w-2xl mx-auto mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product URL {!productName && !productEan && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://example.com/product/lasana-vegetariana"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required={!productName && !productEan}
                />
                <p className="mt-1 text-xs text-gray-500">
                  💡 {productName || productEan
                    ? 'Provide a link to the official product page for more accurate results'
                    : 'AI will extract product name, description, images, and other data from this URL'}
                </p>
              </div>

              <div className="text-center">
                <button
                  onClick={fetchEnrichment}
                  disabled={!productName && !productEan && !sourceUrl}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>{productName || productEan ? 'Generate Suggestions' : 'Extract & Enrich from URL'}</span>
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600">Analyzing product and generating suggestions...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">Error</h4>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {suggestions && (
            <div className="space-y-6">
              {/* Enrichment Method Indicator */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {enrichmentMethod === 'standard' && (
                      <>
                        <span className="text-2xl">🤖</span>
                        <div>
                          <p className="font-medium text-blue-900">Standard AI Enrichment</p>
                          <p className="text-sm text-blue-700">Gemini + OpenAI + Google Images</p>
                        </div>
                      </>
                    )}
                    {enrichmentMethod === 'web_extraction' && canUseWebSearch && (
                      <>
                        <span className="text-2xl">📄</span>
                        <div>
                          <p className="font-medium text-blue-900">Web Results Extraction</p>
                          <p className="text-sm text-blue-700">Real data from Google Search</p>
                        </div>
                      </>
                    )}
                    {enrichmentMethod === 'grounded' && (
                      <>
                        <span className="text-2xl">⚡</span>
                        <div>
                          <p className="font-medium text-blue-900">Premium Google Search Grounding</p>
                          <p className="text-sm text-blue-700">Verified sources with citations</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Grounding Info */}
              {groundingInfo && groundingInfo.sourceUrls && groundingInfo.sourceUrls.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">✓ Verified Sources</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    {groundingInfo.sourceUrls.slice(0, 3).map((url: string, idx: number) => (
                      <li key={idx}>• {url}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-green-600 mt-2">
                    {groundingInfo.searchQueriesUsed?.length || 0} search queries used
                  </p>
                </div>
              )}

              {/* Product Name */}
              {suggestions.name && (
                <FieldSuggestion
                  label="Product Name"
                  currentValue={currentData?.name}
                  suggestedValue={suggestions.name}
                  approved={approvals.name}
                  onToggle={() => toggleApproval('name')}
                  metadata={metadata?.name}
                />
              )}

              {/* Description */}
              {suggestions.description && (
                <FieldSuggestion
                  label="Description"
                  currentValue={currentData?.description}
                  suggestedValue={suggestions.description}
                  approved={approvals.description}
                  onToggle={() => toggleApproval('description')}
                  metadata={metadata?.description}
                  multiline
                />
              )}

              {/* Description rewrites for non-web-search types */}
              {!canUseWebSearch && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-yellow-900">AI Description Rewrites</p>
                      <p className="text-xs text-yellow-800 mt-1">
                        Get alternative descriptions from Gemini and OpenAI without searching the web.
                      </p>
                    </div>
                    <button
                      onClick={fetchRewrites}
                      disabled={rewriteLoading}
                      className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-300 text-white rounded-lg text-xs font-medium flex items-center space-x-1"
                    >
                      {rewriteLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Get rewrites</span>
                        </>
                      )}
                    </button>
                  </div>

                  {rewrites && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {rewrites.gemini && (
                        <div className="border border-yellow-200 rounded-lg p-3 bg-white space-y-2">
                          <p className="text-xs font-semibold text-yellow-900 flex items-center space-x-1">
                            <span>🤖 Gemini</span>
                          </p>
                          <p className="text-sm text-gray-800 whitespace-pre-line">
                            {rewrites.gemini}
                          </p>
                          <button
                            onClick={() => applyRewrite('gemini')}
                            className="mt-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-medium"
                          >
                            Use this description
                          </button>
                        </div>
                      )}

                      {rewrites.openai && (
                        <div className="border border-yellow-200 rounded-lg p-3 bg-white space-y-2">
                          <p className="text-xs font-semibold text-yellow-900 flex items-center space-x-1">
                            <span>🤖 OpenAI</span>
                          </p>
                          <p className="text-sm text-gray-800 whitespace-pre-line">
                            {rewrites.openai}
                          </p>
                          <button
                            onClick={() => applyRewrite('openai')}
                            className="mt-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-medium"
                          >
                            Use this description
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Brand */}
              {suggestions.brand && (
                <FieldSuggestion
                  label="Brand"
                  currentValue={currentData?.brand}
                  suggestedValue={suggestions.brand}
                  approved={approvals.brand}
                  onToggle={() => toggleApproval('brand')}
                  metadata={metadata?.brand}
                />
              )}

              {/* Category */}
              {suggestions.category && (
                <FieldSuggestion
                  label="Category"
                  currentValue={currentData?.category}
                  suggestedValue={suggestions.category}
                  approved={approvals.category}
                  onToggle={() => toggleApproval('category')}
                  metadata={metadata?.category}
                />
              )}

              {/* Product Type */}
              {suggestions.type && (
                <FieldSuggestion
                  label="Product Type"
                  currentValue={currentData?.type}
                  suggestedValue={suggestions.type}
                  approved={approvals.type}
                  onToggle={() => toggleApproval('type')}
                  metadata={metadata?.type}
                />
              )}

              {/* EAN */}
              {suggestions.ean && (
                <FieldSuggestion
                  label="EAN/Barcode"
                  currentValue={currentData?.ean}
                  suggestedValue={suggestions.ean}
                  approved={approvals.ean}
                  onToggle={() => toggleApproval('ean')}
                  metadata={metadata?.ean}
                />
              )}

              {/* Progressive Enhancement Actions */}
              {enrichmentMethod === 'standard' && canUseWebSearch && (
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3 text-center">Not satisfied with these results?</h3>
                  <p className="text-sm text-gray-600 mb-4 text-center">Try these alternative enrichment methods:</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Web Extraction */}
                    <button
                      onClick={fetchWebExtraction}
                      disabled={loading}
                      className="flex items-center justify-center space-x-2 px-4 py-3 bg-white hover:bg-blue-50 border-2 border-blue-200 text-blue-700 rounded-lg font-medium transition-all hover:shadow-md disabled:opacity-50"
                    >
                      <span className="text-xl">📄</span>
                      <div className="text-left">
                        <p className="text-sm font-semibold">Extract from Web</p>
                        <p className="text-xs text-gray-600">Real Google results • FREE</p>
                      </div>
                    </button>

                    {/* Premium Grounding */}
                    <button
                      onClick={fetchGroundedEnrichment}
                      disabled={loading}
                      className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all hover:shadow-lg disabled:opacity-50"
                    >
                      <span className="text-xl">⚡</span>
                      <div className="text-left">
                        <p className="text-sm font-semibold">Premium Grounding</p>
                        <p className="text-xs opacity-90">Verified sources • +$0.035</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {enrichmentMethod === 'web_extraction' && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-3 text-center">
                    Still want more accuracy? Try premium grounding:
                  </p>
                  <button
                    onClick={fetchGroundedEnrichment}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all hover:shadow-lg disabled:opacity-50"
                  >
                    <span className="text-xl">⚡</span>
                    <div>
                      <p className="text-sm font-semibold">Upgrade to Premium Grounding</p>
                      <p className="text-xs opacity-90">Get verified sources with citations • +$0.035</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Images */}
              {suggestions.images && suggestions.images.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Imágenes Sugeridas</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Selecciona imágenes para agregar al producto (click para seleccionar)
                  </p>

                  {/* Barcode Search Results */}
                  {imageSources?.googleImagesByBarcode > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="h-px flex-1 bg-gray-300"></div>
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          Búsqueda por Código de Barras ({imageSources.googleImagesByBarcode} resultados)
                        </p>
                        <div className="h-px flex-1 bg-gray-300"></div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {suggestions.images.slice(0, imageSources.googleImagesByBarcode).map((imageUrl, index) => (
                          <ImageCard
                            key={`barcode-${index}`}
                            imageUrl={imageUrl}
                            index={index}
                            isSelected={selectedImages.includes(imageUrl)}
                            isUploading={uploadingImages.has(imageUrl)}
                            onToggle={() => toggleImageSelection(imageUrl)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Name/Brand Search Results */}
                  {imageSources?.googleImagesByName > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="h-px flex-1 bg-gray-300"></div>
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          Búsqueda por Nombre/Marca ({imageSources.googleImagesByName} resultados)
                        </p>
                        <div className="h-px flex-1 bg-gray-300"></div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {suggestions.images
                          .slice(
                            imageSources.googleImagesByBarcode || 0,
                            (imageSources.googleImagesByBarcode || 0) + imageSources.googleImagesByName
                          )
                          .map((imageUrl, index) => (
                            <ImageCard
                              key={`name-${index}`}
                              imageUrl={imageUrl}
                              index={index}
                              isSelected={selectedImages.includes(imageUrl)}
                              isUploading={uploadingImages.has(imageUrl)}
                              onToggle={() => toggleImageSelection(imageUrl)}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* AI-Generated Results (Gemini/OpenAI) */}
                  {suggestions.images.length > (imageSources?.googleImagesByBarcode || 0) + (imageSources?.googleImagesByName || 0) && (
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="h-px flex-1 bg-gray-300"></div>
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          Sugerencias de IA (Gemini/OpenAI)
                        </p>
                        <div className="h-px flex-1 bg-gray-300"></div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {suggestions.images
                          .slice((imageSources?.googleImagesByBarcode || 0) + (imageSources?.googleImagesByName || 0))
                          .map((imageUrl, index) => (
                            <ImageCard
                              key={`ai-${index}`}
                              imageUrl={imageUrl}
                              index={index}
                              isSelected={selectedImages.includes(imageUrl)}
                              isUploading={uploadingImages.has(imageUrl)}
                              onToggle={() => toggleImageSelection(imageUrl)}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Search for More Images Button */}
                  <div className="mt-4 text-center">
                    <button
                      onClick={fetchMoreImages}
                      disabled={loadingMoreImages}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                    >
                      {loadingMoreImages ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>🔍 Buscar Más Imágenes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {suggestions && (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            >
              <Check className="w-5 h-5" />
              <span>Apply Approved Changes</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface FieldSuggestionProps {
  label: string;
  currentValue: any;
  suggestedValue: any;
  approved: boolean;
  onToggle: () => void;
  metadata?: FieldMetadata;
  multiline?: boolean;
}

function FieldSuggestion({
  label,
  currentValue,
  suggestedValue,
  approved,
  onToggle,
  metadata,
  multiline = false,
}: FieldSuggestionProps) {
  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'gemini':
        return { icon: '🤖', label: 'Gemini', color: 'bg-blue-100 text-blue-700' };
      case 'openai':
        return { icon: '🤖', label: 'OpenAI', color: 'bg-green-100 text-green-700' };
      case 'google_search':
        return { icon: '🔍', label: 'Google', color: 'bg-purple-100 text-purple-700' };
      default:
        return { icon: '💡', label: 'AI', color: 'bg-gray-100 text-gray-700' };
    }
  };

  const getConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case 'high':
        return { label: 'High', color: 'bg-green-100 text-green-700' };
      case 'medium':
        return { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' };
      case 'low':
        return { label: 'Low', color: 'bg-red-100 text-red-700' };
      default:
        return null;
    }
  };

  const sourceBadge = getSourceBadge(metadata?.source);
  const confidenceBadge = getConfidenceBadge(metadata?.confidence);

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      approved ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <h4 className="font-medium text-gray-900">{label}</h4>
          {metadata && (
            <div className="flex items-center space-x-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sourceBadge.color}`}>
                {sourceBadge.icon} {sourceBadge.label}
              </span>
              {confidenceBadge && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${confidenceBadge.color}`}>
                  {confidenceBadge.label}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            approved
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {approved ? 'Approved' : 'Approve'}
        </button>
      </div>

      <div className="space-y-2">
        {currentValue && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Current:</p>
            <p className={`text-sm ${multiline ? '' : 'truncate'} text-gray-600`}>
              {currentValue}
            </p>
          </div>
        )}

        <div>
          <p className="text-xs text-gray-500 mb-1">Suggested:</p>
          <p className={`text-sm ${multiline ? '' : 'truncate'} font-medium ${
            approved ? 'text-green-900' : 'text-gray-900'
          }`}>
            {suggestedValue}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ImageCardProps {
  imageUrl: string;
  index: number;
  isSelected: boolean;
  isUploading: boolean;
  onToggle: () => void;
}

function ImageCard({ imageUrl, index, isSelected, isUploading, onToggle }: ImageCardProps) {
  const [dimensions, setDimensions] = React.useState<{ width: number; height: number } | null>(null);

  return (
    <div
      onClick={onToggle}
      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
        isSelected
          ? 'border-green-500 ring-2 ring-green-200'
          : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="aspect-square w-full">
        <img
          src={imageUrl}
          alt={`Sugerencia ${index + 1}`}
          className="w-full h-full object-cover"
          onLoad={(e) => {
            const img = e.target as HTMLImageElement;
            setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          }}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (img.src !== FALLBACK_IMAGE) {
              img.src = FALLBACK_IMAGE;
            }
          }}
        />
      </div>

      {/* Dimensions overlay */}
      {dimensions && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs py-1 px-2 text-center">
          {dimensions.width} × {dimensions.height}
        </div>
      )}

      {isSelected && (
        <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
          {isUploading ? (
            <div className="bg-blue-500 rounded-full p-1">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          ) : (
            <div className="bg-green-500 rounded-full p-1">
              <Check className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
