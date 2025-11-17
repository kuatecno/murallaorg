'use client';

import { useState, useRef } from 'react';
import apiClient from '@/lib/api-client';

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  label?: string;
}

export default function ImageUploader({
  images,
  onImagesChange,
  maxImages = 10,
  label = 'Product Images',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images`);
      return;
    }

    setUploading(true);

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
      onImagesChange([...images, ...uploadedUrls]);
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (index: number, url: string) => {
    // Extract public_id from Cloudinary URL if needed
    // For now, just remove from UI
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label} {images.length > 0 && `(${images.length}/${maxImages})`}
      </label>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.svg"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
          disabled={uploading}
        />
        <div className="flex flex-col items-center">
          <svg
            className="w-12 h-12 text-gray-400 mb-3"
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
          {uploading ? (
            <p className="text-sm text-gray-600">Uploading...</p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-1">
                Drag & drop images here, or click to select
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, GIF, SVG up to 10MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((imageUrl, index) => {
            const isSvg = imageUrl.toLowerCase().endsWith('.svg') || imageUrl.includes('.svg?');
            return (
              <div
                key={index}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 group ${isSvg ? 'bg-white p-2' : ''}`}
              >
                <img
                  src={imageUrl}
                  alt={`Uploaded ${index + 1}`}
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
                  handleRemoveImage(index, imageUrl);
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
}
