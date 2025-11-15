/**
 * Product Enrichment API
 * POST /api/products/enrich - Enrich product data using BOTH Google Gemini (with Search) and OpenAI
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import prisma from '@/lib/prisma';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Clean JSON response from LLM - removes markdown code fences and extra whitespace
 */
function cleanJsonResponse(text: string): string {
  // Remove markdown code fences (```json ... ``` or ``` ... ```)
  let cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

function stripSourceAnnotations(text?: string | null): string | undefined {
  if (!text) return text ?? undefined;

  const cleaned = text
    .replace(/\s*\(\s*(fuente|source)\s*:[^)]+\)/gi, '')
    .replace(/\s*\[\s*(fuente|source)\s*:[^\]]+\]/gi, '')
    .replace(/\s*(fuente|source)\s*:\s*https?:\S+/gi, '')
    .replace(/\s*(fuente|source)\s*:\s*[^\.]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned || undefined;
}

// Available categories with hierarchical structure
const CATEGORIES = {
  'Barra': {
    emoji: '☕',
    subcategories: {
      'Café': {
        emoji: '☕',
        items: ['☕🔥 Café Caliente', '☕❄️ Café Frío', '☕🌀 Café Frapeado']
      },
      'Matcha': {
        emoji: '🍵',
        items: ['🍵🔥 Matcha Caliente', '🍵❄️ Matcha Frío', '🍵🌀 Matcha Frapeado']
      },
      'Té': {
        emoji: '🫖',
        items: ['🫖🔥 Té Caliente', '🫖❄️ Té Frío', '🫖🌀 Té Frapeado']
      },
      'Jugos Naturales y Limonadas': { emoji: '🍋', items: [] },
      'Frapés': { emoji: '🥤', items: [] },
      'Mocktails': { emoji: '🍹', items: [] }
    }
  },
  'Comida': { emoji: '🍜', subcategories: {} },
  'Antojitos': { emoji: '🍰', subcategories: {} },
  'Arte': { emoji: '🎨', subcategories: {} }
};

// Flattened list for AI prompt
const CATEGORY_LIST = [
  // Barra - Café
  '☕🔥 Café Caliente',
  '☕❄️ Café Frío',
  '☕🌀 Café Frapeado',
  // Barra - Matcha
  '🍵🔥 Matcha Caliente',
  '🍵❄️ Matcha Frío',
  '🍵🌀 Matcha Frapeado',
  // Barra - Té
  '🫖🔥 Té Caliente',
  '🫖❄️ Té Frío',
  '🫖🌀 Té Frapeado',
  // Barra - Otros
  '🍋 Jugos Naturales y Limonadas',
  '🥤 Frapés',
  '🍹 Mocktails',
  // Otras categorías principales
  '🍜 Comida',
  '🍰 Antojitos',
  '🎨 Arte'
];

// Product types
const PRODUCT_TYPES = [
  'INPUT',
  'READY_PRODUCT',
  'MANUFACTURED',
  'MADE_TO_ORDER',
  'SERVICE',
];

// Product formats
const PRODUCT_FORMATS = [
  'PACKAGED',
  'FROZEN',
  'FRESH',
];

// Allowed tags/etiquetas that AI can suggest
const ALLOWED_TAGS = [
  'vegano',
  'vegetariano',
  'sin azúcar añadido',
  'sin gluten',
  'sin procesar',
];

interface EnrichmentRequest {
  productId?: string;
  name?: string;
  ean?: string;
  tenantId: string;
  variantNames?: string[];
  sourceUrl?: string; // Optional URL to product page
}

interface EnrichmentSuggestion {
  name?: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  brand?: string;
  ean?: string;
  type?: string;
  format?: string;
  tags?: string[];
  images?: string[];
  [key: string]: any; // Allow dynamic field access
}

interface FieldMetadata {
  value: any;
  source: 'gemini' | 'openai' | 'google_search' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
}

interface EnrichmentWithMetadata {
  name?: FieldMetadata;
  description?: FieldMetadata;
  shortDescription?: FieldMetadata;
  category?: FieldMetadata;
  brand?: FieldMetadata;
  ean?: FieldMetadata;
  type?: FieldMetadata;
  format?: FieldMetadata;
  tags?: FieldMetadata;
  [key: string]: FieldMetadata | undefined; // Allow dynamic field access
}

export async function POST(request: NextRequest) {
  try {
    const body: EnrichmentRequest = await request.json();
    const { productId, name, ean, tenantId, variantNames, sourceUrl } = body;

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

    // Allow URL-only enrichment for create-from-link feature
    if (!productData.name && !productData.ean && !sourceUrl) {
      return NextResponse.json(
        { error: 'Product name, EAN, or source URL is required' },
        { status: 400 }
      );
    }

    // If only URL is provided, fetch the webpage content first
    let webpageContent = '';
    if (sourceUrl && !productData.name && !productData.ean) {
      try {
        console.log('🌐 Fetching webpage content from:', sourceUrl);
        const pageResponse = await fetch(sourceUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ProductEnricher/1.0)',
          },
        });

        if (pageResponse.ok) {
          const html = await pageResponse.text();
          // Extract basic metadata from HTML
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
          const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
          const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);

          webpageContent = `
Contenido extraído de la página web:
- Título: ${titleMatch?.[1] || ogTitleMatch?.[1] || 'No encontrado'}
- Descripción: ${descMatch?.[1] || ogDescMatch?.[1] || 'No encontrada'}
`;

          // Try to extract product name from URL as fallback
          const urlPath = new URL(sourceUrl).pathname;
          const pathParts = urlPath.split('/').filter(Boolean);
          if (pathParts.length > 0) {
            const lastPart = pathParts[pathParts.length - 1];
            const urlProductName = lastPart.replace(/-/g, ' ').replace(/\.[^.]+$/, '');
            webpageContent += `- Nombre del producto (de URL): ${urlProductName}\n`;
          }

          console.log('✅ Webpage content extracted successfully');
        }
      } catch (error) {
        console.error('❌ Failed to fetch webpage:', error);
        // Continue without webpage content
      }
    }

    // Build Gemini prompt with search grounding
    const prompt = `Eres un asistente experto en productos chilenos y latinoamericanos. Busca información REAL del siguiente producto usando Google Search.

PRODUCTO A INVESTIGAR:
${productData.name ? `- Nombre: ${productData.name}` : ''}
${productData.ean ? `- Código EAN: ${productData.ean}` : ''}
${productData.brand ? `- Marca: ${productData.brand}` : ''}
${sourceUrl ? `- URL del producto: ${sourceUrl}` : ''}
${webpageContent ? `\n${webpageContent}` : ''}

INSTRUCCIONES IMPORTANTES:
${sourceUrl ? `1. 🎯 PRIORIDAD MÁXIMA: Usa la información extraída de la página web arriba
   - Si no se proporcionó nombre arriba, DEBES usar el título de la página o el nombre de la URL como base
   - Genera un nombre apropiado para el producto basado en el contenido de la página` : '1. USA GOOGLE SEARCH para encontrar información REAL y VERIFICABLE de la marca oficial'}
2. Busca el sitio web oficial, Instagram, Facebook, o e-commerce chileno del producto
3. Prioriza información de fuentes chilenas conocidas
4. Para las imágenes, busca URLs REALES de:
   - Sitio web oficial de la marca
   - Instagram de la marca
   - E-commerce chileno (Jumbo, Lider, Santa Isabel, etc.)
   - Páginas de productos verificadas
5. TODAS las respuestas en ESPAÑOL
6. No incluyas textos como "(Fuente: ...)", URLs ni citas dentro de la descripción; guarda las fuentes para el panel de referencias

CAMPOS A COMPLETAR (devuelve SOLO JSON válido):

{
  "name": "Nombre mejorado del producto en español",
  "description": "Descripción detallada en español (2-3 oraciones) con información REAL de la marca. Si no encuentras info verificada, indica 'Información genérica'. Nunca incluyas '(Fuente: ...)' ni URLs aquí",
  "shortDescription": "Descripción corta y concisa del producto (máximo 80 caracteres). Debe capturar la esencia del producto en pocas palabras.",
  "category": "Mejor coincidencia de estas categorías: ${CATEGORY_LIST.join(', ')}",
  "brand": "Nombre oficial de la marca",
  "ean": "Código EAN si lo encuentras",
  "type": "Uno de: ${PRODUCT_TYPES.join(', ')}",
  "format": "Uno de: ${PRODUCT_FORMATS.join(', ')} o null si no aplica",
  "tags": [
    "Lista de etiquetas relevantes elegidas SOLO de: ${ALLOWED_TAGS.join(', ')} (en minúsculas)",
    "No inventes etiquetas nuevas"
  ],
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
  "shortDescription": "Muffin vegano de zanahoria con ingredientes naturales",
  "category": "🍰 Antojitos",
  "brand": "Mis Amigos Veganos",
  "ean": null,
  "type": "READY_PRODUCT",
  "format": "PACKAGED",
  "tags": ["vegano"],
  "images": ["[URL real del producto]"]
}

BUSCA EN GOOGLE AHORA y devuelve SOLO el objeto JSON con información real encontrada.`;

    console.log('🔍 Sending parallel requests to Gemini and OpenAI...');

    // Call BOTH APIs in parallel for better results
    const [geminiResult, openaiResult] = await Promise.all([
      // Gemini with Google Search
      (async () => {
        try {
          const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json',
            }
          });
          const result = await model.generateContent(prompt);
          const responseText = result.response.text();
          const cleanedText = cleanJsonResponse(responseText);
          console.log('✅ Gemini response received');
          return JSON.parse(cleanedText);
        } catch (error) {
          console.error('❌ Gemini error:', error);
          return null;
        }
      })(),

      // OpenAI for additional insights
      (async () => {
        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Eres un asistente experto en productos chilenos y latinoamericanos. Respondes en ESPAÑOL con información verificable. Responde SOLO con JSON válido.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          });
          const responseContent = completion.choices[0]?.message?.content;
          console.log('✅ OpenAI response received');
          if (!responseContent) return null;
          const cleanedText = cleanJsonResponse(responseContent);
          return JSON.parse(cleanedText);
        } catch (error) {
          console.error('❌ OpenAI error:', error);
          return null;
        }
      })(),
    ]);

    // Helper function to calculate confidence
    const calculateConfidence = (value: any, hasGemini: boolean, hasOpenai: boolean): 'high' | 'medium' | 'low' => {
      if (!value || value === '') return 'low';
      if (hasGemini && hasOpenai) return 'high'; // Both AIs agree
      if (hasGemini || hasOpenai) return 'medium'; // One AI provided it
      return 'low';
    };

    // Merge results with metadata tracking
    let suggestions: EnrichmentSuggestion = {};
    let metadata: EnrichmentWithMetadata = {};

    const fields = ['name', 'description', 'shortDescription', 'category', 'brand', 'ean', 'type', 'format', 'tags'];

    fields.forEach(field => {
      const geminiValue = geminiResult?.[field];
      const openaiValue = openaiResult?.[field];

      const normalizedGeminiValue =
        field === 'description' ? stripSourceAnnotations(geminiValue) : geminiValue;
      const normalizedOpenaiValue =
        field === 'description' ? stripSourceAnnotations(openaiValue) : openaiValue;

      if (normalizedGeminiValue) {
        suggestions[field] = normalizedGeminiValue;
        metadata[field] = {
          value: normalizedGeminiValue,
          source: 'gemini',
          confidence: calculateConfidence(
            normalizedGeminiValue,
            true,
            !!normalizedOpenaiValue && normalizedOpenaiValue === normalizedGeminiValue
          ),
        };
      } else if (normalizedOpenaiValue) {
        suggestions[field] = normalizedOpenaiValue;
        metadata[field] = {
          value: normalizedOpenaiValue,
          source: 'openai',
          confidence: calculateConfidence(normalizedOpenaiValue, false, true),
        };
      }
    });

    // Clear any AI-generated images - we only want Google Custom Search results
    suggestions.images = [];

    if (!suggestions || (!geminiResult && !openaiResult)) {
      // If we have webpage content, at least return something basic
      if (webpageContent) {
        const urlObj = new URL(sourceUrl!);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        const urlProductName = pathParts.length > 0
          ? pathParts[pathParts.length - 1].replace(/-/g, ' ').replace(/\.[^.]+$/, '')
          : 'Product from URL';

        suggestions = {
          name: urlProductName,
          description: 'Product imported from URL - please update description',
          type: 'READY_PRODUCT',
        };
        console.log('⚠️ Both AIs failed, using basic URL extraction');
      } else {
        return NextResponse.json(
          { error: 'Failed to extract product data. Please ensure the URL is accessible and try again.' },
          { status: 500 }
        );
      }
    }

    console.log('🤝 Merged suggestions from both AI models');

    // Fetch additional real images from Google Custom Search API
    let googleImagesByName: string[] = [];
    let googleImagesByBarcode: string[] = [];

    if (process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
      try {
        // Search 1: Brand + Name
        const nameQuery = `${suggestions.brand || productData.brand || ''} ${suggestions.name || productData.name}`.trim();
        console.log('🔍 Searching Google Images by name:', nameQuery);

        const nameSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(nameQuery)}&searchType=image&num=10&safe=active`;

        // Search 2: Barcode/EAN (if available)
        let barcodeSearchUrl = '';
        const ean = suggestions.ean || productData.ean;
        console.log('📦 Product EAN from AI:', suggestions.ean);
        console.log('📦 Product EAN from DB:', productData.ean);
        console.log('📦 Final EAN for search:', ean);

        if (ean) {
          console.log('🔍 Searching Google Images by barcode:', ean);
          barcodeSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(ean)}&searchType=image&num=10&safe=active`;
        } else {
          console.log('⚠️ No EAN available - skipping barcode search');
        }

        // Fetch both searches in parallel
        const searchPromises = [fetch(nameSearchUrl)];
        if (barcodeSearchUrl) {
          searchPromises.push(fetch(barcodeSearchUrl));
        }

        const [nameResponse, barcodeResponse] = await Promise.all(searchPromises);

        if (nameResponse.ok) {
          const nameData = await nameResponse.json();
          googleImagesByName = nameData.items?.map((item: any) => item.link).filter((link: string) => link) || [];
          console.log('✅ Google Images by name found:', googleImagesByName.length);
        }

        if (barcodeResponse && barcodeResponse.ok) {
          const barcodeData = await barcodeResponse.json();
          googleImagesByBarcode = barcodeData.items?.map((item: any) => item.link).filter((link: string) => link) || [];
          console.log('✅ Google Images by barcode found:', googleImagesByBarcode.length);
        }

      } catch (error) {
        console.error('❌ Google Custom Search error:', error);
      }
    }

    // Combine all image sources: Barcode search > Name search (Google only)
    const allImages = [
      ...googleImagesByBarcode,
      ...googleImagesByName,
    ]
      .filter(img => img && img.startsWith('http'))
      .slice(0, 20); // Up to 20 images total from Google

    suggestions.images = allImages;
    console.log('🖼️ Total images from Google Custom Search:', allImages.length);
    console.log('📸 Image URLs:', allImages);

    // Validate, normalize, and clean suggestions
    const normalizedFormat = PRODUCT_FORMATS.includes(suggestions.format || '')
      ? suggestions.format
      : productData.format || undefined;

    const normalizedTags = Array.isArray(suggestions.tags)
      ? suggestions.tags
          .filter(tag => typeof tag === 'string')
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => ALLOWED_TAGS.includes(tag))
      : [];

    // Validate and truncate short description to 80 characters
    const shortDesc = suggestions.shortDescription
      ? suggestions.shortDescription.slice(0, 80)
      : undefined;

    const enrichedData: EnrichmentSuggestion = {
      name: suggestions.name || productData.name,
      description: stripSourceAnnotations(suggestions.description) || undefined,
      shortDescription: shortDesc,
      category: suggestions.category || undefined,
      brand: suggestions.brand || undefined,
      ean: suggestions.ean || productData.ean || undefined,
      type: PRODUCT_TYPES.includes(suggestions.type || '')
        ? suggestions.type
        : 'READY_PRODUCT',
      format: normalizedFormat,
      tags: normalizedTags.length > 0 ? normalizedTags : undefined,
      images: Array.isArray(suggestions.images)
        ? suggestions.images.filter(img => img && img.startsWith('http'))
        : [],
    };

    console.log('🖼️ Final enriched data:', enrichedData);

    return NextResponse.json({
      success: true,
      currentData: productData,
      suggestions: enrichedData,
      metadata: metadata,
      enrichmentMethod: 'standard',
      message: 'Product data enriched using Google Custom Search + Gemini + OpenAI',
      sources: {
        googleImagesByName: googleImagesByName.length,
        googleImagesByBarcode: googleImagesByBarcode.length,
        gemini: !!geminiResult,
        openai: !!openaiResult,
        totalImages: enrichedData.images?.length || 0,
      },
    });

  } catch (error: any) {
    console.error('Error enriching product:', error);

    return NextResponse.json(
      { error: 'Failed to enrich product data', details: error.message },
      { status: 500 }
    );
  }
}
