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
  category?: FieldMetadata;
  brand?: FieldMetadata;
  ean?: FieldMetadata;
  type?: FieldMetadata;
  format?: FieldMetadata;
  tags?: FieldMetadata;
  [key: string]: FieldMetadata | undefined; // Allow dynamic field access
}

interface EnrichmentMethod {
  name: string;
  description: string;
  data: EnrichmentSuggestion;
  metadata?: EnrichmentWithMetadata;
  cost?: number;
  confidence?: 'high' | 'medium' | 'low';
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

CAMPOS A COMPLETAR (devuelve SOLO JSON válido):

{
  "name": "Nombre mejorado del producto en español",
  "description": "Descripción detallada en español (2-3 oraciones) con información REAL de la marca. Si no encuentras info verificada, indica 'Información genérica'",
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
  "category": "🍰 Antojitos",
  "brand": "Mis Amigos Veganos",
  "ean": null,
  "type": "READY_PRODUCT",
  "format": "PACKAGED",
  "tags": ["vegano"],
  "images": ["[URL real del producto]"]
}

BUSCA EN GOOGLE AHORA y devuelve SOLO el objeto JSON con información real encontrada.`;

    // Run three enrichment methods in parallel
    console.log('🔍 Running three enrichment methods in parallel...');

    const [standardResult, webExtractResult, premiumResult] = await Promise.all([
      // Method 1: Standard API (Gemini + OpenAI with Google Search)
      (async () => {
        try {
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

          // Merge results with metadata tracking
          let suggestions: EnrichmentSuggestion = {};
          let metadata: EnrichmentWithMetadata = {};

          const fields = ['name', 'description', 'category', 'brand', 'ean', 'type', 'format', 'tags'];

          fields.forEach(field => {
            const geminiValue = geminiResult?.[field];
            const openaiValue = openaiResult?.[field];

            if (geminiValue) {
              suggestions[field] = geminiValue;
              metadata[field] = {
                value: geminiValue,
                source: 'gemini',
                confidence: calculateConfidence(geminiValue, true, !!openaiValue && openaiValue === geminiValue),
              };
            } else if (openaiValue) {
              suggestions[field] = openaiValue;
              metadata[field] = {
                value: openaiValue,
                source: 'openai',
                confidence: calculateConfidence(openaiValue, false, true),
              };
            }
          });

          // Clear AI-generated images - will use Google Custom Search
          suggestions.images = [];

          return { suggestions, metadata, geminiResult, openaiResult };
        } catch (error) {
          console.error('❌ Standard method error:', error);
          return null;
        }
      })(),

      // Method 2: Extract from Web (webpage content only)
      (async () => {
        try {
          if (!sourceUrl) return null;

          console.log('🌐 Extracting data from webpage:', sourceUrl);
          const pageResponse = await fetch(sourceUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; ProductEnricher/1.0)',
            },
          });

          if (!pageResponse.ok) return null;

          const html = await pageResponse.text();
          
          // Extract structured data from HTML
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
          const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
          const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
          const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
          
          // Extract product name from URL as fallback
          const urlPath = new URL(sourceUrl).pathname;
          const pathParts = urlPath.split('/').filter(Boolean);
          const urlProductName = pathParts.length > 0
            ? pathParts[pathParts.length - 1].replace(/-/g, ' ').replace(/\.[^.]+$/, '')
            : 'Product from URL';

          const webSuggestions: EnrichmentSuggestion = {
            name: titleMatch?.[1] || ogTitleMatch?.[1] || urlProductName,
            description: descMatch?.[1] || ogDescMatch?.[1] || 'Product imported from URL - please update description',
            category: '🍜 Comida', // Default category
            brand: null,
            ean: null,
            type: 'READY_PRODUCT',
            format: 'PACKAGED',
            tags: [],
            images: ogImageMatch ? [ogImageMatch[1]] : [],
          };

          const webMetadata: EnrichmentWithMetadata = {
            name: {
              value: webSuggestions.name,
              source: 'google_search',
              confidence: 'medium'
            },
            description: {
              value: webSuggestions.description,
              source: 'google_search',
              confidence: 'medium'
            },
            images: {
              value: webSuggestions.images,
              source: 'google_search',
              confidence: 'medium'
            }
          };

          return { suggestions: webSuggestions, metadata: webMetadata };
        } catch (error) {
          console.error('❌ Web extract error:', error);
          return null;
        }
      })(),

      // Method 3: Premium Grounding (enhanced Gemini with multiple sources)
      (async () => {
        try {
          const premiumPrompt = `Eres un asistente experto en productos chilenos y latinoamericanos con acceso a búsqueda avanzada. Investiga exhaustivamente el siguiente producto usando múltiples fuentes verificadas.

PRODUCTO A INVESTIGAR:
${productData.name ? `- Nombre: ${productData.name}` : ''}
${productData.ean ? `- Código EAN: ${productData.ean}` : ''}
${productData.brand ? `- Marca: ${productData.brand}` : ''}
${sourceUrl ? `- URL del producto: ${sourceUrl}` : ''}
${webpageContent ? `\n${webpageContent}` : ''}

INSTRUCCIONES ESPECIALES PARA PREMIUM:
1. 🔍 BÚSQUEDA MULTI-FUENTE: Usa Google Search para encontrar información de:
   - Sitio web oficial de la marca
   - Redes sociales verificadas (Instagram, Facebook)
   - E-commerce chilenos (Jumbo, Lider, Santa Isabel, etc.)
   - Distribuidores oficiales
   - Artículos de prensa o reviews

2. 📊 ANÁLISIS PROFUNDO: Proporciona información detallada sobre:
   - Ingredientes principales (si aplica)
   - Información nutricional (si aplica)
   - Origen y fabricante
   - Certificaciones (orgánico, vegano, sin gluten, etc.)

3. 🖼️ IMÁGENES VERIFICADAS: Busca imágenes de ALTA CALIDAD desde:
   - Sitio web oficial
   - Catálogos de productos
   - Fotos profesionales del fabricante

4. 🏷️ ETIQUETAS PRECISAS: Basado en investigación real, asigna etiquetas de: ${ALLOWED_TAGS.join(', ')}

CAMPOS A COMPLETAR (JSON detallado):
{
  "name": "Nombre completo y preciso del producto",
  "description": "Descripción extensa (3-4 oraciones) con detalles del fabricante, ingredientes, origen y beneficios",
  "category": "Categoría exacta: ${CATEGORY_LIST.join(', ')}",
  "brand": "Marca oficial verificada",
  "ean": "Código EAN si se encuentra",
  "type": "Tipo preciso: ${PRODUCT_TYPES.join(', ')}",
  "format": "Formato: ${PRODUCT_FORMATS.join(', ')}",
  "tags": ["Etiquetas basadas en investigación real"],
  "images": ["URLs de imágenes verificadas de alta calidad"]
}

Realiza búsqueda exhaustiva y devuelve SOLO JSON con información premium verificada.`;

          const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
              temperature: 0.2, // Lower temperature for more accurate results
              responseMimeType: 'application/json',
            }
          });

          const result = await model.generateContent(premiumPrompt);
          const responseText = result.response.text();
          const cleanedText = cleanJsonResponse(responseText);
          console.log('✅ Premium grounding response received');
          const premiumData = JSON.parse(cleanedText);

          const premiumMetadata: EnrichmentWithMetadata = {};
          Object.keys(premiumData).forEach(field => {
            if (premiumData[field]) {
              premiumMetadata[field] = {
                value: premiumData[field],
                source: 'gemini',
                confidence: 'high' // Premium method has higher confidence
              };
            }
          });

          return { suggestions: premiumData, metadata: premiumMetadata };
        } catch (error) {
          console.error('❌ Premium grounding error:', error);
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

    // Process and structure the three enrichment methods
    const enrichmentMethods: EnrichmentMethod[] = [];

    // Method 1: Standard API
    if (standardResult) {
      const { suggestions, metadata, geminiResult, openaiResult } = standardResult;
      
      // Validate and normalize standard suggestions
      const normalizedFormat = PRODUCT_FORMATS.includes(suggestions.format || '')
        ? suggestions.format
        : productData.format || undefined;

      const normalizedTags = Array.isArray(suggestions.tags)
        ? suggestions.tags
            .filter(tag => typeof tag === 'string')
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => ALLOWED_TAGS.includes(tag))
        : [];

      const standardData: EnrichmentSuggestion = {
        name: suggestions.name || productData.name,
        description: suggestions.description || undefined,
        category: suggestions.category || undefined,
        brand: suggestions.brand || undefined,
        ean: suggestions.ean || productData.ean || undefined,
        type: PRODUCT_TYPES.includes(suggestions.type || '')
          ? suggestions.type
          : 'READY_PRODUCT',
        format: normalizedFormat,
        tags: normalizedTags.length > 0 ? normalizedTags : undefined,
        images: [], // Will be filled by Google Custom Search
      };

      enrichmentMethods.push({
        name: 'Standard API',
        description: 'Google Gemini + OpenAI with search results',
        data: standardData,
        metadata: metadata,
        cost: 0,
        confidence: 'medium'
      });
    }

    // Method 2: Extract from Web
    if (webExtractResult) {
      const { suggestions, metadata } = webExtractResult;
      
      enrichmentMethods.push({
        name: 'Extract from Web',
        description: 'Real Google results • FREE',
        data: suggestions,
        metadata: metadata,
        cost: 0,
        confidence: 'medium'
      });
    }

    // Method 3: Premium Grounding
    if (premiumResult) {
      const { suggestions, metadata } = premiumResult;
      
      // Validate and normalize premium suggestions
      const normalizedFormat = PRODUCT_FORMATS.includes(suggestions.format || '')
        ? suggestions.format
        : productData.format || undefined;

      const normalizedTags = Array.isArray(suggestions.tags)
        ? suggestions.tags
            .filter(tag => typeof tag === 'string')
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => ALLOWED_TAGS.includes(tag))
        : [];

      const premiumData: EnrichmentSuggestion = {
        name: suggestions.name || productData.name,
        description: suggestions.description || undefined,
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

      enrichmentMethods.push({
        name: 'Premium Grounding',
        description: 'Verified sources • +$0.035',
        data: premiumData,
        metadata: metadata,
        cost: 0.035,
        confidence: 'high'
      });
    }

    // Fetch additional images from Google Custom Search for standard method
    if (standardResult && process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
      try {
        const standardSuggestions = standardResult.suggestions;
        const nameQuery = `${standardSuggestions?.brand || productData.brand || ''} ${standardSuggestions?.name || productData.name}`.trim();
        
        console.log('🔍 Searching Google Images for standard method:', nameQuery);
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(nameQuery)}&searchType=image&num=10&safe=active`;
        
        const searchResponse = await fetch(searchUrl);
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const googleImages = searchData.items?.map((item: any) => item.link).filter((link: string) => link) || [];
          
          // Add images to the standard method
          const standardMethod = enrichmentMethods.find(m => m.name === 'Standard API');
          if (standardMethod) {
            standardMethod.data.images = googleImages.slice(0, 20);
          }
          
          console.log('✅ Google Images found for standard method:', googleImages.length);
        }
      } catch (error) {
        console.error('❌ Google Custom Search error for standard method:', error);
      }
    }

    // If no methods succeeded, return error
    if (enrichmentMethods.length === 0) {
      return NextResponse.json(
        { error: 'All enrichment methods failed. Please try again.' },
        { status: 500 }
      );
    }

    console.log('✅ Successfully processed', enrichmentMethods.length, 'enrichment methods');

    return NextResponse.json({
      success: true,
      currentData: productData,
      enrichmentMethods: enrichmentMethods,
      message: 'Three enrichment methods completed successfully',
    });

  } catch (error: any) {
    console.error('Error enriching product:', error);

    return NextResponse.json(
      { error: 'Failed to enrich product data', details: error.message },
      { status: 500 }
    );
  }
}
