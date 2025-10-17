/**
 * Auto-Generate Expenses from Invoices
 * Shared utility for automatically creating expenses from tax documents
 */

import prisma from '@/lib/prisma';

export interface AutoGenerateOptions {
  tenantId: string;
  taxDocumentId?: string;
  taxDocumentIds?: string[];
  onlyUnprocessed?: boolean;
}

export interface AutoGenerateResult {
  created: number;
  skipped: number;
  createdExpenses: any[];
  skippedDocuments: Array<{
    documentId: string;
    reason: string;
    folio: string | null;
  }>;
}

/**
 * Auto-generate expenses from tax documents (invoices)
 * @param options - Generation options
 * @returns Result with created/skipped counts and details
 */
export async function autoGenerateExpenses(
  options: AutoGenerateOptions
): Promise<AutoGenerateResult> {
  const { tenantId, taxDocumentId, taxDocumentIds, onlyUnprocessed = true } = options;

  // Get or create default category
  let defaultCategory = await prisma.expenseCategory.findFirst({
    where: { tenantId, name: 'Auto-Generated' }
  });

  if (!defaultCategory) {
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

  // Get or create default status
  let defaultStatus = await prisma.expenseStatus.findFirst({
    where: { tenantId, name: 'Pending Review' }
  });

  if (!defaultStatus) {
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
    // Only process received invoices (emitter is someone else)
    emitterRUT: { not: null },
    totalAmount: { gt: 0 }
  };

  if (taxDocumentId) {
    taxDocumentWhere.id = taxDocumentId;
  } else if (taxDocumentIds && taxDocumentIds.length > 0) {
    taxDocumentWhere.id = { in: taxDocumentIds };
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

      // Get default payment account
      const defaultPaymentAccount = await prisma.paymentAccount.findFirst({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'asc' }
      });

      const expense = await prisma.expense.create({
        data: {
          date: doc.issuedAt || doc.createdAt,
          supplier: doc.emitterName || 'Unknown Supplier',
          description: `${doc.type} ${doc.folio || doc.documentCode} - ${doc.emitterName}`,
          amount: doc.totalAmount || 0,
          currency: doc.currency,
          documentType: doc.type === 'FACTURA' ? 'FACTURA' : doc.type === 'BOLETA' ? 'BOLETA' : 'OTRO',
          documentNumber: doc.folio || doc.documentCode?.toString(),
          thirdPartyDocType: doc.type,
          thirdPartyDocNumber: doc.folio,
          notes: `Auto-generated from ${doc.type} ${doc.folio}`,
          paymentType: 'COMPANY_ACCOUNT',
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

  return {
    created: createdExpenses.length,
    skipped: skippedDocuments.length,
    createdExpenses,
    skippedDocuments
  };
}
