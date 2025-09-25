/**
 * Expense Statuses API
 * Get all expense statuses for the tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/expenses/statuses
 * Get all expense statuses for the tenant
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

    const statuses = await prisma.expenseStatus.findMany({
      where: {
        tenantId
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: statuses
    });

  } catch (error) {
    console.error('Error fetching expense statuses:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch expense statuses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}