'use client';

import { useState } from 'react';
import { X, Check, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface EnrichmentSuggestion {
  name?: string;
  description?: string;
  category?: string;
  brand?: string;
  ean?: string;
  type?: string;
  menuSection?: string;
  images?: string[];
}

interface EnrichmentResponse {
  suggestions: EnrichmentSuggestion;
  currentData: any;
  sources?: {
    googleImagesByName?: number;
    googleImagesByBarcode?: number;
    gemini?: boolean;
    openai?: boolean;
    totalImages?: number;
  };
}

interface ProductEnrichmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  productName?: string;
  productEan?: string;
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
  onApprove,
}: ProductEnrichmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingMoreImages, setLoadingMoreImages] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<EnrichmentSuggestion | null>(null);
  const [currentData, setCurrentData] = useState<any>(null);
  const [imageSources, setImageSources] = useState<any>(null);
  const [approvals, setApprovals] = useState<FieldApproval>({});
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [cloudinaryUrls, setCloudinaryUrls] = useState<Map<string, string>>(new Map());

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
          name: productName,
          ean: productEan,
          tenantId: user.tenantId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enrich product');
      }

      const data = await response.json();
      setSuggestions(data.suggestions);
      setCurrentData(data.currentData);
      setImageSources(data.sources);

      // Initialize all fields as approved by default
      const initialApprovals: FieldApproval = {};
      Object.keys(data.suggestions).forEach(key => {
        if (key !== 'images') {
          initialApprovals[key] = true;
        }
      });
      setApprovals(initialApprovals);

      // Auto-select first image if available
      if (data.suggestions.images && data.suggestions.images.length > 0) {
        setSelectedImages([data.suggestions.images[0]]);
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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.suggestions.images) {
          // Merge new images with existing ones (avoiding duplicates)
          setSuggestions(prev => ({
            ...prev!,
            images: [
              ...(prev?.images || []),
              ...data.suggestions.images.filter((img: string) => !prev?.images?.includes(img))
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
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 mx-auto text-blue-500 mb-4" />
              <p className="text-gray-600 mb-6">
                Click the button below to generate AI-powered suggestions for this product
              </p>
              <button
                onClick={fetchEnrichment}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Generate Suggestions</span>
              </button>
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
              {/* Product Name */}
              {suggestions.name && (
                <FieldSuggestion
                  label="Product Name"
                  currentValue={currentData?.name}
                  suggestedValue={suggestions.name}
                  approved={approvals.name}
                  onToggle={() => toggleApproval('name')}
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
                  multiline
                />
              )}

              {/* Brand */}
              {suggestions.brand && (
                <FieldSuggestion
                  label="Brand"
                  currentValue={currentData?.brand}
                  suggestedValue={suggestions.brand}
                  approved={approvals.brand}
                  onToggle={() => toggleApproval('brand')}
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
                />
              )}

              {/* Menu Section */}
              {suggestions.menuSection && (
                <FieldSuggestion
                  label="Menu Section"
                  currentValue={currentData?.menuSection}
                  suggestedValue={suggestions.menuSection}
                  approved={approvals.menuSection}
                  onToggle={() => toggleApproval('menuSection')}
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
                />
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
  multiline?: boolean;
}

function FieldSuggestion({
  label,
  currentValue,
  suggestedValue,
  approved,
  onToggle,
  multiline = false,
}: FieldSuggestionProps) {
  return (
    <div className={`border rounded-lg p-4 transition-all ${
      approved ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900">{label}</h4>
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
  return (
    <div
      onClick={onToggle}
      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
        isSelected
          ? 'border-green-500 ring-2 ring-green-200'
          : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      <img
        src={imageUrl}
        alt={`Sugerencia ${index + 1}`}
        className="w-full h-32 object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Image+Not+Available';
        }}
      />
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
