/**
 * Product Images Type Definitions
 *
 * Supports structured image storage with separate categories for:
 * - photos: Regular product photos (JPG, PNG, etc.)
 * - icons: SVG icons used with colored backgrounds in UI
 */

export interface ProductImages {
  photos?: string[];
  icons?: string[];
}

/**
 * Type guard to check if images data is structured format
 */
export function isStructuredImages(images: any): images is ProductImages {
  return (
    typeof images === 'object' &&
    images !== null &&
    !Array.isArray(images) &&
    (Array.isArray(images.photos) || Array.isArray(images.icons))
  );
}

/**
 * Type guard to check if images data is legacy flat array format
 */
export function isLegacyImagesArray(images: any): images is string[] {
  return Array.isArray(images);
}

/**
 * Normalize images from any format to structured format
 * Handles backward compatibility with legacy flat array format
 */
export function normalizeProductImages(images: any): ProductImages {
  // Already structured format
  if (isStructuredImages(images)) {
    return {
      photos: images.photos || [],
      icons: images.icons || [],
    };
  }

  // Legacy flat array - treat all as photos
  if (isLegacyImagesArray(images)) {
    return {
      photos: images,
      icons: [],
    };
  }

  // Empty or invalid - return empty structure
  return {
    photos: [],
    icons: [],
  };
}

/**
 * Get all image URLs from structured format
 */
export function getAllImageUrls(images: ProductImages): string[] {
  return [...(images.photos || []), ...(images.icons || [])];
}

/**
 * Get only photo URLs
 */
export function getPhotoUrls(images: any): string[] {
  const normalized = normalizeProductImages(images);
  return normalized.photos || [];
}

/**
 * Get only icon URLs
 */
export function getIconUrls(images: any): string[] {
  const normalized = normalizeProductImages(images);
  return normalized.icons || [];
}

/**
 * Get primary image (first photo, or first icon if no photos)
 */
export function getPrimaryImage(images: any): string | null {
  const normalized = normalizeProductImages(images);

  if (normalized.photos && normalized.photos.length > 0) {
    return normalized.photos[0];
  }

  if (normalized.icons && normalized.icons.length > 0) {
    return normalized.icons[0];
  }

  return null;
}
