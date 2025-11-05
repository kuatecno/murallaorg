/**
 * API Keys Management
 * POST /api/auth/api-keys - Create new API key
 * GET /api/auth/api-keys - List all API keys (masked)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateApiKey, hashApiKey } from '@/lib/auth';

/**
 * POST /api/auth/api-keys
 * Create a new API key for a tenant
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, name, expiresInDays } = body;

    if (!tenantId || !name) {
      return NextResponse.json(
        { error: 'tenantId and name are required' },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId, isActive: true },
      select: { id: true, name: true, slug: true }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Generate the API key
    const apiKey = generateApiKey(true);
    const hashedKey = hashApiKey(apiKey);

    // Calculate expiration date if provided
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Store the hashed key in database
    const keyRecord = await prisma.apiKey.create({
      data: {
        name,
        key: hashedKey,
        tenantId,
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        tenantId: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'API key created successfully. Save this key - it will not be shown again!',
      apiKey: apiKey, // Only shown once!
      keyInfo: {
        id: keyRecord.id,
        name: keyRecord.name,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug
        },
        isActive: keyRecord.isActive,
        expiresAt: keyRecord.expiresAt,
        createdAt: keyRecord.createdAt,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/api-keys
 * List all API keys for a tenant (keys are masked)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: apiKeys.map(key => ({
        ...key,
        keyPreview: 'muralla_live_••••••••', // Masked for security
      }))
    });

  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys', details: error.message },
      { status: 500 }
    );
  }
}
