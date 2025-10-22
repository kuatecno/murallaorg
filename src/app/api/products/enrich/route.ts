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
    const prompt = `Eres un asistente de enriquecimiento de datos de productos para un sistema de inventario de café/restaurante en Chile.

INFORMACIÓN DEL PRODUCTO:
${productData.name ? `- Nombre: ${productData.name}` : ''}
${productData.ean ? `- Código EAN/Código de barras: ${productData.ean}` : ''}
${productData.description ? `- Descripción actual: ${productData.description}` : ''}
${productData.category ? `- Categoría actual: ${productData.category}` : ''}
${productData.brand ? `- Marca actual: ${productData.brand}` : ''}

INSTRUCCIONES IMPORTANTES:
1. PRIORIZA información REAL y VERIFICABLE de la marca oficial del producto
2. Si reconoces la marca, busca información actual de su sitio web o redes sociales oficiales
3. Para productos chilenos, verifica información de marcas locales conocidas
4. Si no estás seguro, indica "información no verificada" en la descripción
5. TODAS las respuestas deben estar en ESPAÑOL

CAMPOS A COMPLETAR:

1. **name**: Nombre claro y conciso del producto (mejora si es necesario)
2. **description**: Descripción detallada en español (2-3 oraciones) con características reales del producto, ingredientes, o usos. PRIORIZA información oficial de la marca.
3. **category**: Categoría del producto (ej: "Repostería", "Bebidas", "Snacks", "Ingredientes", etc.)
4. **brand**: Nombre de la marca (si es identificable del nombre o EAN)
5. **ean**: Código EAN/código de barras (si puedes identificarlo del nombre del producto)
6. **type**: Uno de estos: ${PRODUCT_TYPES.join(', ')}
   - INPUT: Ingredientes/insumos crudos
   - READY_PRODUCT: Productos pre-hechos listos para vender
   - MANUFACTURED: Productos hechos en casa
   - MADE_TO_ORDER: Productos hechos por pedido
   - SERVICE: Artículos de servicio
7. **menuSection**: Mejor sección coincidente de: ${MENU_SECTIONS.join(', ')}
8. **images**: Array de 2-3 URLs de imágenes REALES del producto. IMPORTANTE:
   - Busca imágenes del producto REAL en sitios oficiales de la marca
   - Usa URLs directas de imágenes (.jpg, .png, .webp)
   - Verifica que las URLs sean accesibles públicamente
   - Prioriza: Sitio web oficial > Instagram/Redes sociales > E-commerce chileno
   - Ejemplos de fuentes confiables: https://images.unsplash.com/, sitios oficiales de marcas

FORMATO DE RESPUESTA (JSON):
Devuelve SOLO un objeto JSON válido con estos campos. Si un campo no se puede determinar, usa null.

Ejemplo:
{
  "name": "Muffin de Chocolate",
  "description": "Delicioso muffin vegano con chispas de chocolate de Mis Amigos Veganos. Hecho con ingredientes naturales y sin productos de origen animal. Perfecto para el desayuno o merienda.",
  "category": "Repostería",
  "brand": "Mis Amigos Veganos",
  "ean": "7804123456789",
  "type": "READY_PRODUCT",
  "menuSection": "Dulces",
  "images": ["https://images.unsplash.com/photo-1607958996333-41aef7caefaa", "https://images.unsplash.com/photo-1426869884541-df7117556757"]
}`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente experto en productos chilenos y latinoamericanos que enriquece datos de productos para sistemas de inventario. SIEMPRE respondes en ESPAÑOL con información REAL y VERIFICABLE de las marcas. Prioriza datos oficiales de sitios web, redes sociales y e-commerce de las marcas. Incluye URLs de imágenes reales y accesibles. Responde SOLO con JSON válido.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more factual responses
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
