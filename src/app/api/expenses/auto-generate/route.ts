/**
 * Auto-Generate Expenses from Invoices API
 * POST /api/expenses/auto-generate
 * Automatically creates expenses from tax documents (invoices)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/expenses/auto-generate
 * Generate expenses from all or specific tax documents
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taxDocumentId, onlyUnprocessed = true } = body;

    // TODO: Get tenantId from authentication context
    // For now, using the first available tenant
    const firstTenant = await prisma.tenant.findFirst();
    if (!firstTenant) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 404 }
      );
    }
    const tenantId = firstTenant.id;

    // Get default category and status for auto-generated expenses
    let defaultCategory = await prisma.expenseCategory.findFirst({
      where: { tenantId, name: 'Auto-Generated' }
    });

    if (!defaultCategory) {
      // Create default category if it doesn't exist
      defaultCategory = await prisma.expenseCategory.create({
        data: {
          name: 'Auto-Generated',
          emoji: '🤖',
          description: 'Automatically generated from invoices',
          color: '#3B82F6',
          tenantId
        }
      });
    }

    let defaultStatus = await prisma.expenseStatus.findFirst({
      where: { tenantId, name: 'Pending Review' }
    });

    if (!defaultStatus) {
      // Create default status if it doesn't exist
      defaultStatus = await prisma.expenseStatus.create({
        data: {
          name: 'Pending Review',
          color: '#F59E0B',
          isDefault: true,
          tenantId
        }
      });
    }

    // Build query for tax documents
    const taxDocumentWhere: any = {
      tenantId,
      // Only process received invoices (not ones we issued)
      emitterRUT: { not: null },
      receiverRUT: { not: null },
      totalAmount: { gt: 0 }
    };

    if (taxDocumentId) {
      taxDocumentWhere.id = taxDocumentId;
    }

    if (onlyUnprocessed) {
      // Only process documents that don't already have expenses
      taxDocumentWhere.expenses = { none: {} };
    }

    const taxDocuments = await prisma.taxDocument.findMany({
      where: taxDocumentWhere,
      include: {
        expenses: true
      }
    });

    const createdExpenses = [];
    const skippedDocuments = [];

    for (const doc of taxDocuments) {
      try {
        // Skip if already has expenses and we're only processing unprocessed
        if (onlyUnprocessed && doc.expenses.length > 0) {
          skippedDocuments.push({
            documentId: doc.id,
            reason: 'Already has expenses',
            folio: doc.folio
          });
          continue;
        }

        // Determine payment type - default to COMPANY_ACCOUNT
        // This could be enhanced with business logic to detect employee payments
        const paymentType = 'COMPANY_ACCOUNT';

        // Get default payment account
        const defaultPaymentAccount = await prisma.paymentAccount.findFirst({
          where: { tenantId, isActive: true },
          orderBy: { createdAt: 'asc' }
        });

        const expense = await prisma.expense.create({
          data: {
            date: doc.issuedAt || doc.createdAt,
            supplier: doc.emitterName || 'Unknown Supplier',
            description: `Invoice ${doc.folio || doc.documentCode} - ${doc.emitterName}`,
            amount: doc.totalAmount || 0,
            currency: doc.currency,
            documentType: doc.type === 'FACTURA' ? 'FACTURA' : 'BOLETA',
            documentNumber: doc.folio || doc.documentCode?.toString(),
            thirdPartyDocType: doc.type,
            thirdPartyDocNumber: doc.folio,
            notes: `Auto-generated from ${doc.type} ${doc.folio}`,
            paymentType,
            paymentAccountId: defaultPaymentAccount?.id,
            isCompanyExpense: true,
            excludeFromReports: false,
            isFromInvoice: true,
            taxDocumentId: doc.id,
            categoryId: defaultCategory.id,
            statusId: defaultStatus.id,
            tenantId
          },
          include: {
            category: true,
            status: true,
            paymentAccount: true,
            taxDocument: {
              select: {
                id: true,
                folio: true,
                emitterName: true,
                type: true
              }
            }
          }
        });

        createdExpenses.push(expense);

      } catch (error) {
        console.error(`Error creating expense for document ${doc.id}:`, error);
        skippedDocuments.push({
          documentId: doc.id,
          reason: error instanceof Error ? error.message : 'Unknown error',
          folio: doc.folio
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created: createdExpenses.length,
        skipped: skippedDocuments.length,
        createdExpenses,
        skippedDocuments
      }
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