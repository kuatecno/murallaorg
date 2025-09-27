/**
 * Tenants API
 * GET /api/tenants - Fetch all active tenants
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/tenants
 * Fetch all active tenants
 */
export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        rut: true,
        slug: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      tenants,
    });

  } catch (error) {
    console.error('Error fetching tenants:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch tenants',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    );
  }
}