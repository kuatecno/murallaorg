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
          console.log('✅ Gemini response received');
          return JSON.parse(responseText);
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
          return responseContent ? JSON.parse(responseContent) : null;
        } catch (error) {
          console.error('❌ OpenAI error:', error);
          return null;
        }
      })(),
    ]);

    // Merge results: Gemini (with search) takes priority, OpenAI fills gaps
    let suggestions: EnrichmentSuggestion = {};

    if (geminiResult) {
      console.log('📊 Gemini suggestions:', geminiResult);
      suggestions = { ...geminiResult };
    }

    if (openaiResult) {
      console.log('📊 OpenAI suggestions:', openaiResult);
      // Fill in missing fields from OpenAI
      if (!suggestions.description && openaiResult.description) {
        suggestions.description = openaiResult.description;
      }
      if (!suggestions.category && openaiResult.category) {
        suggestions.category = openaiResult.category;
      }
      if (!suggestions.brand && openaiResult.brand) {
        suggestions.brand = openaiResult.brand;
      }
      // Merge images (Gemini first, then OpenAI)
      const geminiImages = Array.isArray(suggestions.images) ? suggestions.images : [];
      const openaiImages = Array.isArray(openaiResult.images) ? openaiResult.images : [];
      suggestions.images = [...geminiImages, ...openaiImages].filter(img => img && img.startsWith('http')).slice(0, 5);
    }

    if (!suggestions || (!geminiResult && !openaiResult)) {
      return NextResponse.json(
        { error: 'Both AI services failed to respond' },
        { status: 500 }
      );
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

        const nameSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(nameQuery)}&searchType=image&num=6&imgSize=XLARGE&imgType=photo&safe=active`;

        // Search 2: Barcode/EAN (if available)
        let barcodeSearchUrl = '';
        const ean = suggestions.ean || productData.ean;
        if (ean) {
          console.log('🔍 Searching Google Images by barcode:', ean);
          barcodeSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(ean)}&searchType=image&num=6&imgSize=XLARGE&imgType=photo&safe=active`;
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

    // Combine all image sources: Barcode search > Name search > Gemini > OpenAI
    const allImages = [
      ...googleImagesByBarcode,
      ...googleImagesByName,
      ...(Array.isArray(suggestions.images) ? suggestions.images : [])
    ]
      .filter(img => img && img.startsWith('http'))
      .slice(0, 12); // Up to 12 images total (6 per row)

    suggestions.images = allImages;
    console.log('🖼️ Total images from all sources:', allImages.length);

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
