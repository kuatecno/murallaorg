/**
 * Simple API Key Authentication
 *
 * Usage:
 * - External clients send: Authorization: Bearer YOUR_API_KEY
 * - Server validates key and returns tenantId
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export interface AuthResult {
  success: boolean;
  tenantId?: string;
  error?: string;
}

/**
 * Generate a new API key (not hashed)
 * Format: muralla_live_32_random_chars or muralla_test_32_random_chars
 */
export function generateApiKey(isLive = true): string {
  const prefix = isLive ? 'muralla_live_' : 'muralla_test_';
  const randomPart = crypto.randomBytes(24).toString('hex'); // 48 chars
  return `${prefix}${randomPart}`;
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Validate API key from request and return tenant info
 */
export async function validateApiKey(request: NextRequest): Promise<AuthResult> {
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return { success: false, error: 'Missing Authorization header' };
    }

    // Expected format: "Bearer muralla_live_..."
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return { success: false, error: 'Invalid Authorization header format. Use: Bearer YOUR_API_KEY' };
    }

    const apiKey = parts[1];

    // Validate key format
    if (!apiKey.startsWith('muralla_live_') && !apiKey.startsWith('muralla_test_')) {
      return { success: false, error: 'Invalid API key format' };
    }

    // Hash the key to compare with database
    const hashedKey = hashApiKey(apiKey);

    // Look up the key in database
    const keyRecord = await prisma.apiKey.findFirst({
      where: {
        key: hashedKey,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        expiresAt: true,
      }
    });

    if (!keyRecord) {
      return { success: false, error: 'Invalid or expired API key' };
    }

    // Update last used timestamp (async, don't wait)
    prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() }
    }).catch(err => console.error('Failed to update lastUsedAt:', err));

    return {
      success: true,
      tenantId: keyRecord.tenantId
    };

  } catch (error) {
    console.error('API key validation error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Middleware helper - validate and return tenant ID or error response
 */
export async function requireApiKey(request: NextRequest): Promise<{ tenantId: string } | Response> {
  const auth = await validateApiKey(request);

  if (!auth.success) {
    return new Response(
      JSON.stringify({ error: auth.error }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return { tenantId: auth.tenantId! };
}
