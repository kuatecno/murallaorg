/**
 * Rewrite Product Description API
 * POST /api/products/rewrite-description - Rewrite a product description using Gemini and OpenAI (no web search)
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RewriteRequest {
  productName?: string;
  productType?: string;
  description: string;
  tenantId?: string;
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  return cleaned.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body: RewriteRequest = await request.json();
    const { productName, productType, description } = body;

    if (!description || description.trim() === '') {
      return NextResponse.json(
        { error: 'Description is required for rewriting' },
        { status: 400 }
      );
    }

    const typeLabel = productType || 'PRODUCTO';

    const baseInstructions = `Eres un copywriter experto en productos gastronómicos chilenos.

Reescribe la siguiente descripción en ESPAÑOL para que sea más clara, atractiva y profesional.

- Mantén el significado original
- No inventes ingredientes ni beneficios que no estén implícitos
- Usa un tono cálido y cercano, apto para menú de cafetería o e-commerce
- Máximo 2-3 oraciones

Información de contexto (opcional):
- Nombre del producto: ${productName || 'N/A'}
- Tipo de producto: ${typeLabel}

Descripción original:
"""
${description}
"""`;

    // Call both providers in parallel
    const [geminiResult, openaiResult] = await Promise.all([
      (async () => {
        try {
          const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
              temperature: 0.4,
              responseMimeType: 'application/json',
            },
          });

          const result = await model.generateContent({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `${baseInstructions}

Devuelve SOLO JSON con esta forma:
{
  "description": "texto reescrito en español"
}`,
                  },
                ],
              },
            ],
          });

          const responseText = result.response.text();
          const cleanedText = cleanJsonResponse(responseText);
          const parsed = JSON.parse(cleanedText);
          return parsed.description || description;
        } catch (error) {
          console.error('❌ Gemini rewrite error:', error);
          return description;
        }
      })(),
      (async () => {
        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'Eres un copywriter experto en productos gastronómicos chilenos. Responde SOLO con JSON válido.',
              },
              {
                role: 'user',
                content: `${baseInstructions}

Devuelve SOLO JSON con esta forma:
{
  "description": "texto reescrito en español"
}`,
              },
            ],
            temperature: 0.4,
            response_format: { type: 'json_object' },
          });

          const responseContent = completion.choices[0]?.message?.content;
          if (!responseContent) return description;
          const cleanedText = cleanJsonResponse(responseContent);
          const parsed = JSON.parse(cleanedText);
          return parsed.description || description;
        } catch (error) {
          console.error('❌ OpenAI rewrite error:', error);
          return description;
        }
      })(),
    ]);

    return NextResponse.json({
      success: true,
      rewrites: {
        gemini: geminiResult,
        openai: openaiResult,
      },
    });
  } catch (error: any) {
    console.error('Error rewriting product description:', error);

    return NextResponse.json(
      { error: 'Failed to rewrite description', details: error.message },
      { status: 500 }
    );
  }
}
