/**
 * Product Enrichment with Google Search Grounding API
 * POST /api/products/enrich-grounded - Premium enrichment using Gemini with Google Search grounding
 * Cost: $0.035 per request ($35 per 1,000 queries)
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️ GEMINI_API_KEY is not set. Grounded enrichment will return 500 errors.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Clean JSON response from LLM - removes markdown code fences and extra whitespace
 */
function cleanJsonResponse(text: string): string {
  // Remove markdown code fences (```json ... ``` or ``` ... ```)
  let cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  // Trim whitespace
  cleaned = cleaned.trim();

  // If the model returned extra commentary before/after the JSON,
  // extract the substring from the first "{" to the last "}".
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1).trim();
  }

  return cleaned;
}

// Flattened category list for AI prompt
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

const PRODUCT_TYPES = [
  'INPUT',
  'READY_PRODUCT',
  'MANUFACTURED',
  'MADE_TO_ORDER',
  'SERVICE',
];

interface GroundedRequest {
  productName: string;
  productEan?: string;
  productBrand?: string;
  tenantId: string;
  sourceUrl?: string; // Optional URL to product page
}

export async function POST(request: NextRequest) {
  try {
    const body: GroundedRequest = await request.json();
    const { productName, productEan, productBrand, tenantId, sourceUrl } = body;

    const finalTenantId = request.headers.get('x-tenant-id') || tenantId;

    if (!finalTenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    if (!productName) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: 'Grounded enrichment is not configured',
          details: 'Missing GEMINI_API_KEY environment variable on the server.',
        },
        { status: 500 }
      );
    }

    console.log('⚡ Starting PREMIUM Google Search Grounding for:', productName);
    console.log('💰 Cost: $0.035 for this request');

    const prompt = `Eres un experto en productos chilenos y latinoamericanos. Necesito que investigues información REAL y VERIFICADA sobre el siguiente producto usando Google Search.

PRODUCTO A INVESTIGAR:
- Nombre: ${productName}
${productBrand ? `- Marca: ${productBrand}` : ''}
${productEan ? `- Código EAN/Barcode: ${productEan}` : ''}
${sourceUrl ? `- URL del producto: ${sourceUrl}` : ''}

INSTRUCCIONES IMPORTANTES:
${sourceUrl ? `1. 🎯 PRIORIDAD MÁXIMA: Visita y usa la información de esta URL específica: ${sourceUrl}` : '1. USA GOOGLE SEARCH para encontrar información REAL del producto'}
2. Busca en:
   - Sitio web oficial de la marca
   - E-commerce chileno (Jumbo, Lider, Santa Isabel, Unimarc)
   - Redes sociales oficiales de la marca
   - Sitios de productos verificados
3. Prioriza fuentes chilenas
4. Extrae información verificable y cita tus fuentes
5. Si no encuentras información verificada, indícalo claramente
6. TODAS las respuestas en ESPAÑOL

INFORMACIÓN A EXTRAER:

{
  "name": "Nombre oficial y completo del producto",
  "description": "Descripción detallada (2-3 oraciones) con información REAL de la fuente oficial. Menciona si la info es oficial o genérica.",
  "category": "Mejor coincidencia de estas categorías: ${CATEGORY_LIST.join(', ')}",
  "brand": "Nombre oficial de la marca",
  "ean": "Código EAN/barcode si lo encuentras",
  "type": "El tipo más apropiado de: ${PRODUCT_TYPES.join(', ')}",
  "confidence": "high si encontraste fuentes oficiales, medium si es de retailers, low si es información genérica",
  "verified": true si encontraste el producto en fuentes verificables, false si es información genérica
}

BUSCA EN GOOGLE AHORA y devuelve el JSON con la información más precisa que encuentres. Cita las fuentes en la descripción.`;

    // Use Gemini with Google Search grounding tool
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    // Enable Google Search grounding
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [
        {
          googleSearch: {} as any,
        } as any,
      ],
    });

    const response = result.response;
    const responseText = response.text();

    // Clean the response before parsing (removes markdown code fences)
    const cleanedText = cleanJsonResponse(responseText);

    console.log('📝 Raw response:', responseText.substring(0, 200));
    console.log('🧹 Cleaned response:', cleanedText.substring(0, 200));

    const groundedData = JSON.parse(cleanedText);

    console.log('✅ Grounded enrichment completed');
    console.log('📊 Grounded data:', groundedData);

    // Extract grounding metadata if available
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const searchQueries = groundingMetadata?.webSearchQueries || [];
    const groundingSupports = groundingMetadata?.groundingSupports || [];

    console.log('🔍 Search queries used:', searchQueries);
    console.log('📚 Grounding supports:', groundingSupports.length);

    // Extract source URLs from grounding supports
    const sourceUrls = groundingSupports
      .map((support: any) => support.segment?.text || support.groundingChunkIndices)
      .filter((url: any) => url)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      suggestions: {
        name: groundedData.name,
        description: groundedData.description,
        category: groundedData.category,
        brand: groundedData.brand,
        ean: groundedData.ean,
        type: groundedData.type,
      },
      metadata: {
        name: { value: groundedData.name, source: 'google_search', confidence: groundedData.confidence },
        description: { value: groundedData.description, source: 'google_search', confidence: groundedData.confidence },
        category: { value: groundedData.category, source: 'google_search', confidence: groundedData.confidence },
        brand: { value: groundedData.brand, source: 'google_search', confidence: groundedData.confidence },
        ean: { value: groundedData.ean, source: 'google_search', confidence: groundedData.confidence },
        type: { value: groundedData.type, source: 'google_search', confidence: groundedData.confidence },
      },
      enrichmentMethod: 'grounded',
      grounding: {
        searchQueriesUsed: searchQueries,
        sourcesFound: groundingSupports.length,
        sourceUrls: sourceUrls,
        verified: groundedData.verified,
      },
      message: 'Premium enrichment using Google Search Grounding ($0.035)',
      cost: 0.035,
    });

  } catch (error: any) {
    console.error('❌ Error in grounded enrichment:', error);

    return NextResponse.json(
      { error: 'Failed to perform grounded enrichment', details: error.message },
      { status: 500 }
    );
  }
}
