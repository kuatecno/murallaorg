/**
 * Database Health Check API
 * GET /api/health/db - Check database connection and schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Test basic database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check if categories table exists
    const categoriesCount = await prisma.category.count();
    
    // Check if products table exists
    const productsCount = await prisma.product.count();
    
    // Check if ProductFormat enum exists by trying to query products with format
    let formatSupported = false;
    try {
      await prisma.product.findFirst({
        select: { format: true }
      });
      formatSupported = true;
    } catch (error) {
      console.log('Format field not supported:', error);
    }
    
    return NextResponse.json({
      success: true,
      database: 'connected',
      tables: {
        categories: categoriesCount,
        products: productsCount
      },
      features: {
        formatField: formatSupported
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Database health check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
