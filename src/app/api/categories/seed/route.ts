/**
 * Seed Categories API
 * POST /api/categories/seed - Seed predefined categories for a tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ProductFormat } from '@prisma/client';

const PREDEFINED_CATEGORIES = [
  // Barra - Café
  { name: 'Café Caliente', emoji: '☕🔥', color: '#92400E', description: 'Hot coffee drinks', format: ProductFormat.FRESH },
  { name: 'Café Frío', emoji: '☕❄️', color: '#1E3A8A', description: 'Cold coffee drinks', format: ProductFormat.FRESH },
  { name: 'Café Frapeado', emoji: '☕🌀', color: '#7C3AED', description: 'Blended coffee drinks', format: ProductFormat.FROZEN },
  // Barra - Matcha
  { name: 'Matcha Caliente', emoji: '🍵🔥', color: '#15803D', description: 'Hot matcha drinks', format: ProductFormat.FRESH },
  { name: 'Matcha Frío', emoji: '🍵❄️', color: '#059669', description: 'Cold matcha drinks', format: ProductFormat.FRESH },
  { name: 'Matcha Frapeado', emoji: '🍵🌀', color: '#10B981', description: 'Blended matcha drinks', format: ProductFormat.FROZEN },
  // Barra - Té
  { name: 'Té Caliente', emoji: '🫖🔥', color: '#B45309', description: 'Hot tea drinks', format: ProductFormat.FRESH },
  { name: 'Té Frío', emoji: '🫖❄️', color: '#0891B2', description: 'Cold tea drinks', format: ProductFormat.FRESH },
  { name: 'Té Frapeado', emoji: '🫖🌀', color: '#06B6D4', description: 'Blended tea drinks', format: ProductFormat.FROZEN },
  // Barra - Otros
  { name: 'Jugos Naturales y Limonadas', emoji: '🍋', color: '#CA8A04', description: 'Fresh juices and lemonades', format: ProductFormat.FRESH },
  { name: 'Frapés', emoji: '🥤', color: '#EC4899', description: 'Frappé drinks', format: ProductFormat.FROZEN },
  { name: 'Mocktails', emoji: '🍹', color: '#F43F5E', description: 'Non-alcoholic cocktails', format: ProductFormat.FRESH },
  // Main categories
  { name: 'Comida', emoji: '🍜', color: '#DC2626', description: 'Food items', format: ProductFormat.PACKAGED },
  { name: 'Antojitos', emoji: '🍰', color: '#DB2777', description: 'Snacks and treats', format: ProductFormat.PACKAGED },
  { name: 'Arte', emoji: '🎨', color: '#9333EA', description: 'Art and crafts', format: ProductFormat.PACKAGED },
];

/**
 * POST /api/categories/seed
 * Seed predefined categories for a tenant
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication (JWT or API key)
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // Check if categories already exist
    const existingCategories = await prisma.category.findMany({
      where: { tenantId },
      select: { name: true }
    });

    const existingNames = existingCategories.map(cat => cat.name);
    const missingCategories = PREDEFINED_CATEGORIES.filter(cat => !existingNames.includes(cat.name));

    if (!force && existingCategories.length > 0 && missingCategories.length === 0) {
      return NextResponse.json(
        {
          message: 'Categories already exist for this tenant',
          existingCount: existingCategories.length
        },
        { status: 200 }
      );
    }

    let created;
    if (force) {
      // Delete existing categories and recreate all
      await prisma.category.deleteMany({
        where: { tenantId }
      });
      
      created = await prisma.category.createMany({
        data: PREDEFINED_CATEGORIES.map(cat => ({
          ...cat,
          tenantId,
        })),
        skipDuplicates: true,
      });
    } else {
      // Create only missing categories
      created = await prisma.category.createMany({
        data: missingCategories.map(cat => ({
          ...cat,
          tenantId,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${created.count} categories seeded successfully`,
      count: created.count,
    });

  } catch (error: any) {
    console.error('Error seeding categories:', error);
    return NextResponse.json(
      { error: 'Failed to seed categories', details: error.message },
      { status: 500 }
    );
  }
}
