/**
 * Product Enrichment API
 * POST /api/products/enrich - Enrich product data using Google Gemini with Search
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

    // Build Gemini prompt with search grounding
    const prompt = `Eres un asistente experto en productos chilenos y latinoamericanos. Busca información REAL del siguiente producto usando Google Search.

PRODUCTO A INVESTIGAR:
${productData.name ? `- Nombre: ${productData.name}` : ''}
${productData.ean ? `- Código EAN: ${productData.ean}` : ''}
${productData.brand ? `- Marca: ${productData.brand}` : ''}

INSTRUCCIONES IMPORTANTES:
1. USA GOOGLE SEARCH para encontrar información REAL y VERIFICABLE de la marca oficial
2. Busca el sitio web oficial, Instagram, Facebook, o e-commerce chileno del producto
3. Prioriza información de fuentes chilenas conocidas
4. Para las imágenes, busca URLs REALES de:
   - Sitio web oficial de la marca
   - Instagram de la marca
   - E-commerce chileno (Jumbo, Lider, Santa Isabel, etc.)
   - Páginas de productos verificadas
5. TODAS las respuestas en ESPAÑOL

CAMPOS A COMPLETAR (devuelve SOLO JSON válido):

{
  "name": "Nombre mejorado del producto en español",
  "description": "Descripción detallada en español (2-3 oraciones) con información REAL de la marca. Si no encuentras info verificada, indica 'Información genérica'",
  "category": "Categoría (Repostería, Bebidas, Snacks, Ingredientes, etc.)",
  "brand": "Nombre oficial de la marca",
  "ean": "Código EAN si lo encuentras",
  "type": "Uno de: ${PRODUCT_TYPES.join(', ')}",
  "menuSection": "Mejor coincidencia de: ${MENU_SECTIONS.join(', ')}",
  "images": [
    "URL REAL de imagen del producto desde sitio oficial o e-commerce",
    "Segunda URL REAL (opcional)",
    "Tercera URL REAL (opcional)"
  ]
}

EJEMPLO de respuesta para "Muffin de zanahoria - Mis Amigos Veganos":
{
  "name": "Muffin de Zanahoria Vegano",
  "description": "Muffin vegano de zanahoria elaborado por Mis Amigos Veganos, marca chilena especializada en productos plant-based. Hecho con ingredientes naturales, sin productos de origen animal.",
  "category": "Repostería Vegana",
  "brand": "Mis Amigos Veganos",
  "ean": null,
  "type": "READY_PRODUCT",
  "menuSection": "Dulces",
  "images": ["[URL real del producto]"]
}

BUSCA EN GOOGLE AHORA y devuelve SOLO el objeto JSON con información real encontrada.`;

    console.log('🔍 Sending request to Gemini with search grounding...');

    // Call Gemini API with search grounding
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      }
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log('✅ Gemini response received');

    if (!responseText) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse Gemini response
    let suggestions: EnrichmentSuggestion;
    try {
      suggestions = JSON.parse(responseText);
      console.log('📊 Parsed suggestions:', suggestions);
    } catch (error) {
      console.error('Failed to parse Gemini response:', responseText);
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
        ? suggestions.images.filter(img => img && img.startsWith('http')).slice(0, 3)
        : [],
    };

    console.log('🖼️ Final enriched data:', enrichedData);

    return NextResponse.json({
      success: true,
      currentData: productData,
      suggestions: enrichedData,
      message: 'Product data enriched successfully with Google Search',
    });

  } catch (error: any) {
    console.error('Error enriching product:', error);

    return NextResponse.json(
      { error: 'Failed to enrich product data', details: error.message },
      { status: 500 }
    );
  }
}
