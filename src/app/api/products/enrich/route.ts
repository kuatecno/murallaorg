/**
 * Product Enrichment API
 * POST /api/products/enrich - Enrich product data using OpenAI
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import prisma from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Available menu sections for categorization
const MENU_SECTIONS = [
  'Comidas',
  'Dulces',
  'Bebidas Calientes',
  'Ice Coffee',
  'Frapés',
  'Mocktails',
  'Jugos y Limonadas',
];

// Product types
const PRODUCT_TYPES = [
  'INPUT',
  'READY_PRODUCT',
  'MANUFACTURED',
  'MADE_TO_ORDER',
  'SERVICE',
];

interface EnrichmentRequest {
  productId?: string;
  name?: string;
  ean?: string;
  tenantId: string;
}

interface EnrichmentSuggestion {
  name?: string;
  description?: string;
  category?: string;
  brand?: string;
  ean?: string;
  type?: string;
  images?: string[];
  menuSection?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EnrichmentRequest = await request.json();
    const { productId, name, ean, tenantId } = body;

    // Get tenant from header or body
    const finalTenantId = request.headers.get('x-tenant-id') || tenantId;

    if (!finalTenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Get product data
    let productData: any = { name, ean };

    if (productId) {
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          tenantId: finalTenantId,
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      productData = {
        id: product.id,
        name: product.name,
        ean: product.ean,
        description: product.description,
        category: product.category,
        brand: product.brand,
        type: product.type,
        menuSection: product.menuSection,
      };
    }

    if (!productData.name && !productData.ean) {
      return NextResponse.json(
        { error: 'Product name or EAN is required' },
        { status: 400 }
      );
    }

    // Build OpenAI prompt
    const prompt = `You are a product data enrichment assistant for a cafe/restaurant inventory system.

Given the following product information:
${productData.name ? `- Name: ${productData.name}` : ''}
${productData.ean ? `- EAN/Barcode: ${productData.ean}` : ''}
${productData.description ? `- Current Description: ${productData.description}` : ''}
${productData.category ? `- Current Category: ${productData.category}` : ''}
${productData.brand ? `- Current Brand: ${productData.brand}` : ''}

Please provide enriched product data with the following fields:

1. **name**: A clear, concise product name (if not provided or needs improvement)
2. **description**: A detailed description (2-3 sentences) highlighting key features, ingredients, or uses
3. **category**: Product category (e.g., "Pastries", "Beverages", "Snacks", "Ingredients", etc.)
4. **brand**: Brand name (if identifiable from name or EAN)
5. **ean**: EAN/barcode (if you can identify it from the product name)
6. **type**: One of these: ${PRODUCT_TYPES.join(', ')}
   - INPUT: Raw ingredients/supplies
   - READY_PRODUCT: Pre-made products ready to sell
   - MANUFACTURED: Products made in-house
   - MADE_TO_ORDER: Custom-made products
   - SERVICE: Service items
7. **menuSection**: Best matching section from: ${MENU_SECTIONS.join(', ')}
8. **images**: Array of 2-3 relevant image URLs (use Unsplash or similar free stock photo services)

Return ONLY a valid JSON object with these fields. If a field cannot be determined, use null.

Example format:
{
  "name": "Chocolate Chip Muffin",
  "description": "Delicious muffin with chocolate chips. Perfect for breakfast or a sweet snack.",
  "category": "Pastries",
  "brand": "Mis Amigos Veganos",
  "ean": "7804123456789",
  "type": "READY_PRODUCT",
  "menuSection": "Dulces",
  "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
}`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that enriches product data for inventory systems. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse AI response
    let suggestions: EnrichmentSuggestion;
    try {
      suggestions = JSON.parse(responseContent);
    } catch (error) {
      console.error('Failed to parse AI response:', responseContent);
      return NextResponse.json(
        { error: 'Invalid AI response format' },
        { status: 500 }
      );
    }

    // Validate and clean suggestions
    const enrichedData: EnrichmentSuggestion = {
      name: suggestions.name || productData.name,
      description: suggestions.description || undefined,
      category: suggestions.category || undefined,
      brand: suggestions.brand || undefined,
      ean: suggestions.ean || productData.ean || undefined,
      type: PRODUCT_TYPES.includes(suggestions.type || '')
        ? suggestions.type
        : 'READY_PRODUCT',
      menuSection: MENU_SECTIONS.includes(suggestions.menuSection || '')
        ? suggestions.menuSection
        : undefined,
      images: Array.isArray(suggestions.images)
        ? suggestions.images.slice(0, 3)
        : [],
    };

    return NextResponse.json({
      success: true,
      currentData: productData,
      suggestions: enrichedData,
      message: 'Product data enriched successfully',
    });

  } catch (error: any) {
    console.error('Error enriching product:', error);

    if (error?.error?.type === 'invalid_request_error') {
      return NextResponse.json(
        { error: 'Invalid OpenAI API request', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to enrich product data', details: error.message },
      { status: 500 }
    );
  }
}
