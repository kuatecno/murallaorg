/**
 * Web Metadata Extraction API
 * POST /api/products/extract-web-metadata - Extract product metadata from Google Custom Search results
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const MAX_PAGE_TEXT_LENGTH = 3000;

const sanitizeHtmlToText = (html: string) => {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  const withLineBreaks = withoutScripts
    .replace(/<br\s*\/?>(?=\s*<)/gi, '\n')
    .replace(/<br\s*\/?>(?!\n)/gi, '\n')
    .replace(/<\/p>/gi, '\n\n');

  const plainText = withLineBreaks.replace(/<[^>]+>/g, ' ');

  return plainText
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const fetchPageText = async (url?: string) => {
  if (!url) return { text: '', source: '' };
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MurallaBot/1.0; +https://murallaorg.com)',
      },
    });

    if (!response.ok) {
      return { text: '', source: '' };
    }

    const html = await response.text();
    const text = sanitizeHtmlToText(html);
    if (!text) {
      return { text: '', source: '' };
    }

    return {
      text: text.length > MAX_PAGE_TEXT_LENGTH ? text.slice(0, MAX_PAGE_TEXT_LENGTH) : text,
      source: url,
    };
  } catch (error) {
    console.error('❌ Failed to fetch page content:', url, error);
    return { text: '', source: '' };
  }
};

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

interface ExtractRequest {
  productName: string;
  productEan?: string;
  productBrand?: string;
  productUrl?: string;
  tenantId: string;
}

interface SearchResult {
  title: string;
  snippet: string;
  link: string;
  displayLink: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtractRequest = await request.json();
    const { productName, productEan, productBrand, productUrl, tenantId } = body;

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

    if (!process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
      return NextResponse.json(
        { error: 'Google Custom Search is not configured' },
        { status: 500 }
      );
    }

    console.log('🔍 Extracting web metadata for:', productName);

    // Perform Google Custom Search (web search, not image)
    const searchQueries = [];

    // Query 1: Brand + Product Name
    if (productBrand) {
      searchQueries.push(`${productBrand} ${productName}`);
    } else {
      searchQueries.push(productName);
    }

    // Query 2: EAN if available
    if (productEan) {
      searchQueries.push(productEan);
    }

    // Fetch search results
    const searchResults: SearchResult[] = [];

    for (const query of searchQueries) {
      try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=10`;

        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          const items = data.items || [];

          items.forEach((item: any) => {
            searchResults.push({
              title: item.title,
              snippet: item.snippet,
              link: item.link,
              displayLink: item.displayLink,
            });
          });

          console.log(`✅ Found ${items.length} results for query: "${query}"`);
        }
      } catch (error) {
        console.error(`❌ Search error for query "${query}":`, error);
      }
    }

    if (searchResults.length === 0) {
      return NextResponse.json(
        { error: 'No web results found for this product' },
        { status: 404 }
      );
    }

    console.log(`📄 Total web results found: ${searchResults.length}`);

    const { text: pageText, source: pageSource } = await fetchPageText(productUrl);

    // Use Gemini to synthesize the search results into structured product data
    const searchContext = searchResults
      .slice(0, 10) // Limit to top 10 results
      .map((result, index) => `
[Resultado ${index + 1}]
Sitio: ${result.displayLink}
Título: ${result.title}
Descripción: ${result.snippet}
URL: ${result.link}
`)
      .join('\n');

    const prompt = `Eres un experto en análisis de productos. A continuación te proporciono resultados de búsqueda web REALES sobre un producto.

PRODUCTO: ${productName}
${productBrand ? `MARCA: ${productBrand}` : ''}
${productEan ? `EAN: ${productEan}` : ''}
${pageText ? `\nCONTENIDO DEL SITIO OFICIAL (${pageSource || productUrl}):\n"""${pageText}"""` : ''}

RESULTADOS DE BÚSQUEDA WEB:
${searchContext}

INSTRUCCIONES:
1. Analiza los resultados de búsqueda para extraer información REAL y VERIFICABLE
2. Prioriza información de sitios oficiales y e-commerce conocidos (lider.cl, jumbo.cl, sitios de marca)
3. Si se proporcionó CONTENIDO DEL SITIO OFICIAL, DEBES copiar textualmente el párrafo más relevante sobre el producto sin resumir ni reformular. Respeta acentos, saltos de línea y tono original.
4. Si no hay CONTENIDO DEL SITIO OFICIAL, sintetiza la información usando los snippets.
5. Si encuentras precios, ignóralos (solo queremos metadata descriptiva)
6. TODAS las respuestas en ESPAÑOL

Devuelve SOLO un objeto JSON con esta estructura:

{
  "name": "Nombre mejorado del producto basado en los resultados",
  "description": "Si se proporcionó CONTENIDO DEL SITIO OFICIAL, copia literal del párrafo principal. De lo contrario, descripción detallada sintetizada (2-3 oraciones).",
  "category": "Mejor coincidencia de estas categorías: ${CATEGORY_LIST.join(', ')}",
  "brand": "Marca oficial extraída",
  "ean": "EAN si lo encuentras en los resultados",
  "type": "Uno de: ${PRODUCT_TYPES.join(', ')}",
  "verbatimSource": "URL exacta del sitio citado o vacío",
  "sources": ["displayLink del sitio más relevante", "otro sitio relevante"],
  "confidence": "high si encontraste información de sitio oficial, medium si es de retailer, low si es genérica"
}

Devuelve SOLO el JSON, sin explicaciones adicionales.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const extractedData = JSON.parse(responseText);

    console.log('✅ Web metadata extracted:', extractedData);

    const sources = [pageSource, ...(extractedData.sources || [])].filter(Boolean);
    const descriptionValue = extractedData.description;

    return NextResponse.json({
      success: true,
      suggestions: {
        name: extractedData.name,
        description: descriptionValue,
        category: extractedData.category,
        brand: extractedData.brand,
        ean: extractedData.ean,
        type: extractedData.type,
      },
      metadata: {
        name: { value: extractedData.name, source: 'google_search', confidence: extractedData.confidence },
        description: {
          value: descriptionValue,
          source: pageSource ? 'direct_site' : 'google_search',
          confidence: extractedData.confidence,
        },
        category: { value: extractedData.category, source: 'google_search', confidence: extractedData.confidence },
        brand: { value: extractedData.brand, source: 'google_search', confidence: extractedData.confidence },
        ean: { value: extractedData.ean, source: 'google_search', confidence: extractedData.confidence },
        type: { value: extractedData.type, source: 'google_search', confidence: extractedData.confidence },
      },
      enrichmentMethod: 'web_extraction',
      sources,
      pageSource: pageSource || extractedData.verbatimSource || null,
      searchResultsCount: searchResults.length,
      message: 'Metadata extracted from real web search results',
    });

  } catch (error: any) {
    console.error('Error extracting web metadata:', error);

    return NextResponse.json(
      { error: 'Failed to extract web metadata', details: error.message },
      { status: 500 }
    );
  }
}
