/**
 * Simple test route to verify API is working
 * GET /api/test
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;

    return NextResponse.json({
      status: 'success',
      message: 'API is working',
      database: 'connected',
      timestamp: new Date().toISOString(),
      result
    });
  } catch (error) {
    console.error('Database connection error:', error);

    return NextResponse.json({
      status: 'error',
      message: 'API is working but database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}