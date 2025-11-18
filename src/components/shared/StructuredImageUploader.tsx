'use client';

import { useState, useRef } from 'react';
import apiClient from '@/lib/api-client';
import { ProductImages } from '@/types/product-images';

interface StructuredImageUploaderProps {
  images: ProductImages;
  onImagesChange: (images: ProductImages) => void;
  maxPhotos?: number;
  maxIcons?: number;
  label?: string;
  showIcons?: boolean; // Toggle to show/hide icon upload section
}

export default function StructuredImageUploader({
  images,
  onImagesChange,
  maxPhotos = 10,
  maxIcons = 3,
  label = 'Product Images',
  showIcons = true,
}: StructuredImageUploaderProps) {
  const [uploading, setUploading] = useState<'photos' | 'icons' | null>(null);
  const [dragActive, setDragActive] = useState<'photos' | 'icons' | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null, type: 'photos' | 'icons') => {
    if (!files || files.length === 0) return;

    const currentImages = images[type] || [];
    const maxImages = type === 'photos' ? maxPhotos : maxIcons;

    if (currentImages.length + files.length > maxImages) {
      alert(`You can only upload up to ${maxImages} ${type}`);
      return;
    }

    setUploading(type);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        // Get API key for authentication
        const apiKey = apiClient.getApiKey();
        const headers: HeadersInit = {};
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed. Please check your API key.');
          }
          throw new Error('Upload failed');
        }

        const data = await response.json();
        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onImagesChange({
        ...images,
        [type]: [...currentImages, ...uploadedUrls],
      });
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload images');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = (index: number, type: 'photos' | 'icons') => {
    const currentImages = images[type] || [];
    const newImages = currentImages.filter((_, i) => i !== index);
    onImagesChange({
      ...images,
      [type]: newImages,
    });
  };

  const handleDrag = (e: React.DragEvent, type: 'photos' | 'icons') => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(type);
    } else if (e.type === 'dragleave') {
      setDragActive(null);
    }
  };

  const handleDrop = (e: React.DragEvent, type: 'photos' | 'icons') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files, type);
    }
  };

  const renderUploadSection = (
    type: 'photos' | 'icons',
    inputRef: React.RefObject<HTMLInputElement | null>,
    maxImages: number,
    accept: string,
    title: string,
    description: string
  ) => {
    const currentImages = images[type] || [];
    const isUploading = uploading === type;

    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          {title} {currentImages.length > 0 && `(${currentImages.length}/${maxImages})`}
        </label>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            dragActive === type
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragEnter={(e) => handleDrag(e, type)}
          onDragLeave={(e) => handleDrag(e, type)}
          onDragOver={(e) => handleDrag(e, type)}
          onDrop={(e) => handleDrop(e, type)}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept}
            className="hidden"
            onChange={(e) => handleUpload(e.target.files, type)}
            disabled={isUploading}
          />
          <div className="flex flex-col items-center">
            <svg
              className="w-10 h-10 text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            {isUploading ? (
              <p className="text-sm text-gray-600">Uploading...</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-1">
                  Click or drag & drop
                </p>
                <p className="text-xs text-gray-500">{description}</p>
              </>
            )}
          </div>
        </div>

        {/* Image Preview Grid */}
        {currentImages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {currentImages.map((imageUrl, index) => {
              const isSvg = imageUrl.toLowerCase().endsWith('.svg') || imageUrl.includes('.svg?');
              return (
                <div
                  key={index}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 group ${
                    isSvg ? 'bg-white p-2' : ''
                  }`}
                >
                  <img
                    src={imageUrl}
                    alt={`${title} ${index + 1}`}
                    className={`w-full h-full ${isSvg ? 'object-contain' : 'object-cover'}`}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(index, type);
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">{label}</h3>

      {/* Photos Section */}
      {renderUploadSection(
        'photos',
        photoInputRef,
        maxPhotos,
        'image/jpeg,image/png,image/gif,image/webp',
        'Product Photos',
        'PNG, JPG, GIF, WebP up to 10MB'
      )}

      {/* Icons Section */}
      {showIcons && (
        <div className="pt-4 border-t border-gray-200">
          {renderUploadSection(
            'icons',
            iconInputRef,
            maxIcons,
            'image/svg+xml,.svg',
            'Product Icons (SVG)',
            'SVG files for use with colored backgrounds'
          )}
        </div>
      )}
    </div>
  );
}
