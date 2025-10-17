/**
 * Auto-Generate Expenses from Invoices API
 * POST /api/expenses/auto-generate
 * Automatically creates expenses from tax documents (invoices)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { autoGenerateExpenses } from '@/lib/auto-generate-expenses';

/**
 * POST /api/expenses/auto-generate
 * Generate expenses from all or specific tax documents
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taxDocumentId, onlyUnprocessed = true } = body;

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

    // Use shared utility function
    const result = await autoGenerateExpenses({
      tenantId,
      taxDocumentId,
      onlyUnprocessed
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error auto-generating expenses:', error);
    return NextResponse.json(
      {
        error: 'Failed to auto-generate expenses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}