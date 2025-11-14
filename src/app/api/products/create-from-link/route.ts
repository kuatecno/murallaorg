/**
 * Create Product from Link API
 * POST /api/products/create-from-link - Create a READY_PRODUCT directly from a URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCorsHeaders, corsResponse, corsError } from '@/lib/cors';

interface CreateFromLinkRequest {
  url: string;
  type?: 'READY_PRODUCT'; // Default to READY_PRODUCT
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;

    const body: CreateFromLinkRequest = await request.json();
    const { url, type = 'READY_PRODUCT' } = body;

    if (!url) {
      return corsError('URL is required', 400, origin);
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return corsError('Invalid URL format', 400, origin);
    }

    // First, call the enrichment API to get product data from the URL
    // We provide a placeholder name since the API requires name or EAN, but the real data will be extracted from the URL
    const enrichmentResponse = await fetch(`${request.nextUrl.origin}/api/products/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || '',
      },
      body: JSON.stringify({
        name: 'Product from URL', // Placeholder name, will be replaced by enrichment
        sourceUrl: url,
        tenantId,
      }),
    });

    if (!enrichmentResponse.ok) {
      const errorData = await enrichmentResponse.json();
      return corsError(`Failed to enrich product from URL: ${errorData.error}`, 400, origin);
    }

    const enrichmentData = await enrichmentResponse.json();
    
    if (!enrichmentData.success || !enrichmentData.suggestions) {
      return corsError('No product data could be extracted from the URL', 400, origin);
    }

    const enrichedProduct = enrichmentData.suggestions;

    // Generate a unique SKU based on the product name
    const generateSKU = (name: string): string => {
      if (!name || name === 'Product from URL') {
        // If no name was extracted, use domain from URL
        try {
          const urlObj = new URL(url);
          const domain = urlObj.hostname.replace('www.', '').split('.')[0];
          const timestamp = Date.now().toString().slice(-6);
          return `${domain.toUpperCase()}-${timestamp}`;
        } catch {
          const timestamp = Date.now().toString().slice(-6);
          return `IMPORTED-${timestamp}`;
        }
      }
      
      const cleanName = name
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .toUpperCase()
        .substring(0, 20); // Limit length
      
      const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
      return `${cleanName}-${timestamp}`;
    };

    // Only allow predefined tags from enrichment
    const allowedTags = [
      'vegano',
      'vegetariano',
      'sin azúcar añadido',
      'sin gluten',
      'sin procesar',
    ];

    const normalizedTags = Array.isArray(enrichedProduct.tags)
      ? enrichedProduct.tags.filter((tag: string) => allowedTags.includes(tag))
      : [];

    // Use enriched data or fallback to extracted info from URL
    const productName = enrichedProduct.name && enrichedProduct.name !== 'Product from URL' 
      ? enrichedProduct.name 
      : `Product from ${new URL(url).hostname}`;

    // Prepare product data for creation
    const productData = {
      sku: generateSKU(productName),
      name: productName,
      description: enrichedProduct.description || '',
      type,
      category: enrichedProduct.category || '',
      brand: enrichedProduct.brand || '',
      ean: enrichedProduct.ean || null,
      sourceUrl: url,
      unitPrice: enrichedProduct.price || 0,
      costPrice: enrichedProduct.costPrice || null,
      currentStock: 0, // Start with 0 stock
      minStock: 0,
      maxStock: null,
      unit: 'UNIT',
      format: enrichedProduct.format || null,
      tags: normalizedTags,
      images: enrichedProduct.images || [],
      isActive: true,
      metadata: {
        createdFromLink: true,
        originalUrl: url,
        enrichmentData: enrichedProduct,
      },
    };

    // Create the product
    const createResponse = await fetch(`${request.nextUrl.origin}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || '',
      },
      body: JSON.stringify(productData),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      return corsError(`Failed to create product: ${errorData.error}`, 400, origin);
    }

    const createdProduct = await createResponse.json();

    return corsResponse({
      success: true,
      data: {
        product: createdProduct.data || createdProduct,
        enrichmentData: enrichedProduct,
        sourceUrl: url,
      },
      message: 'Product created successfully from URL',
    }, 201, origin);

  } catch (error: any) {
    console.error('Error creating product from link:', error);
    return corsError('Failed to create product from link', 500, origin);
  }
}
