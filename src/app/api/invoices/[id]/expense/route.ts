/**
 * Invoice-Expense Link API
 * POST /api/invoices/[id]/expense - Generate expense from invoice
 * GET /api/invoices/[id]/expense - Get expenses linked to invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invoices/[id]/expense
 * Get expenses linked to this invoice
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const expenses = await prisma.expense.findMany({
      where: { taxDocumentId: id },
      include: {
        category: true,
        status: true,
        paymentAccount: true,
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: expenses
    });

  } catch (error) {
    console.error('Error fetching invoice expenses:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch expenses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices/[id]/expense
 * Generate expense from this invoice
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get the invoice
    const invoice = await prisma.taxDocument.findUnique({
      where: { id },
      select: {
        id: true,
        folio: true,
        type: true,
        emitterName: true,
        emitterRUT: true,
        totalAmount: true,
        currency: true,
        issuedAt: true,
        createdAt: true,
        tenantId: true,
        expenses: true
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if expense already exists
    if (invoice.expenses && invoice.expenses.length > 0) {
      return NextResponse.json(
        {
          error: 'Expense already exists for this invoice',
          data: invoice.expenses[0]
        },
        { status: 400 }
      );
    }

    // Get or create default category
    let defaultCategory = await prisma.expenseCategory.findFirst({
      where: { tenantId: invoice.tenantId, name: 'Auto-Generated' }
    });

    if (!defaultCategory) {
      defaultCategory = await prisma.expenseCategory.create({
        data: {
          name: 'Auto-Generated',
          emoji: '🤖',
          description: 'Automatically generated from invoices',
          color: '#3B82F6',
          tenantId: invoice.tenantId
        }
      });
    }

    // Get or create default status
    let defaultStatus = await prisma.expenseStatus.findFirst({
      where: { tenantId: invoice.tenantId, name: 'Pending Review' }
    });

    if (!defaultStatus) {
      defaultStatus = await prisma.expenseStatus.create({
        data: {
          name: 'Pending Review',
          color: '#F59E0B',
          isDefault: true,
          tenantId: invoice.tenantId
        }
      });
    }

    // Get default payment account
    const defaultPaymentAccount = await prisma.paymentAccount.findFirst({
      where: { tenantId: invoice.tenantId, isActive: true },
      orderBy: { createdAt: 'asc' }
    });

    // Create the expense
    const expense = await prisma.expense.create({
      data: {
        date: invoice.issuedAt || invoice.createdAt,
        supplier: invoice.emitterName || 'Unknown Supplier',
        description: `Invoice ${invoice.folio || invoice.type} - ${invoice.emitterName}`,
        amount: invoice.totalAmount || 0,
        currency: invoice.currency,
        documentType: invoice.type === 'FACTURA' ? 'FACTURA' : invoice.type === 'BOLETA' ? 'BOLETA' : 'OTRO',
        documentNumber: invoice.folio,
        thirdPartyDocType: invoice.type,
        thirdPartyDocNumber: invoice.folio,
        notes: `Auto-generated from ${invoice.type} ${invoice.folio}`,
        paymentType: 'COMPANY_ACCOUNT',
        paymentAccountId: defaultPaymentAccount?.id,
        isCompanyExpense: true,
        excludeFromReports: false,
        isFromInvoice: true,
        taxDocumentId: invoice.id,
        categoryId: defaultCategory.id,
        statusId: defaultStatus.id,
        tenantId: invoice.tenantId
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

    return NextResponse.json({
      success: true,
      message: 'Expense generated successfully',
      data: expense
    });

  } catch (error) {
    console.error('Error generating expense from invoice:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate expense',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
