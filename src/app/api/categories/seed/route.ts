/**
 * Seed Categories API
 * POST /api/categories/seed - Seed predefined categories for a tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const PREDEFINED_CATEGORIES = [
  // Barra - Café
  { name: '☕🔥 Café Caliente', emoji: '☕🔥', color: '#92400E', description: 'Hot coffee drinks' },
  { name: '☕❄️ Café Frío', emoji: '☕❄️', color: '#1E3A8A', description: 'Cold coffee drinks' },
  { name: '☕🌀 Café Frapeado', emoji: '☕🌀', color: '#7C3AED', description: 'Blended coffee drinks' },
  // Barra - Matcha
  { name: '🍵🔥 Matcha Caliente', emoji: '🍵🔥', color: '#15803D', description: 'Hot matcha drinks' },
  { name: '🍵❄️ Matcha Frío', emoji: '🍵❄️', color: '#059669', description: 'Cold matcha drinks' },
  { name: '🍵🌀 Matcha Frapeado', emoji: '🍵🌀', color: '#10B981', description: 'Blended matcha drinks' },
  // Barra - Té
  { name: '🫖🔥 Té Caliente', emoji: '🫖🔥', color: '#B45309', description: 'Hot tea drinks' },
  { name: '🫖❄️ Té Frío', emoji: '🫖❄️', color: '#0891B2', description: 'Cold tea drinks' },
  { name: '🫖🌀 Té Frapeado', emoji: '🫖🌀', color: '#06B6D4', description: 'Blended tea drinks' },
  // Barra - Otros
  { name: '🍋 Jugos Naturales y Limonadas', emoji: '🍋', color: '#CA8A04', description: 'Fresh juices and lemonades' },
  { name: '🥤 Frapés', emoji: '🥤', color: '#EC4899', description: 'Frappé drinks' },
  { name: '🍹 Mocktails', emoji: '🍹', color: '#F43F5E', description: 'Non-alcoholic cocktails' },
  // Main categories
  { name: '🍜 Comida', emoji: '🍜', color: '#DC2626', description: 'Food items' },
  { name: '🍰 Antojitos', emoji: '🍰', color: '#DB2777', description: 'Snacks and treats' },
  { name: '🎨 Arte', emoji: '🎨', color: '#9333EA', description: 'Art and crafts' },
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

    // Check if categories already exist
    const existingCount = await prisma.category.count({
      where: { tenantId },
    });

    if (existingCount > 0) {
      return NextResponse.json(
        {
          message: 'Categories already exist for this tenant',
          existingCount
        },
        { status: 200 }
      );
    }

    // Create all predefined categories
    const created = await prisma.category.createMany({
      data: PREDEFINED_CATEGORIES.map(cat => ({
        ...cat,
        tenantId,
      })),
      skipDuplicates: true,
    });

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
