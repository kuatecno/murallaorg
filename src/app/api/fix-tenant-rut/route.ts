/**
 * Fix Tenant RUT API (one-time fix)
 * POST /api/fix-tenant-rut - Update Demo Company RUT to valid value
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Simple security check
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.SEED_SECRET || 'your-secret-key-here';

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Update the Demo Company tenant RUT
    const updated = await prisma.tenant.update({
      where: { slug: 'demo' },
      data: { rut: '76123456-0' }
    });

    return NextResponse.json({
      success: true,
      message: 'Demo Company RUT updated successfully',
      tenant: {
        id: updated.id,
        name: updated.name,
        oldRut: '76123456-7',
        newRut: updated.rut
      }
    });
  } catch (error) {
    console.error('Fix tenant RUT error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fix tenant RUT',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to fix Demo Company RUT',
    note: 'Requires Authorization header with Bearer token',
  });
}
