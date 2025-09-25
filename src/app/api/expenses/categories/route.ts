/**
 * Expense Categories API
 * Get all expense categories for the tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/expenses/categories
 * Get all expense categories for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Get tenantId from authentication context
    // For now, using the first available tenant or create a default one
    let firstTenant = await prisma.tenant.findFirst();
    if (!firstTenant) {
      // Create a default tenant if none exists
      firstTenant = await prisma.tenant.create({
        data: {
          name: 'Default Tenant',
          slug: 'default',
          isActive: true
        }
      });
    }
    const tenantId = firstTenant.id;

    const categories = await prisma.expenseCategory.findMany({
      where: {
        tenantId,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch expense categories',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}