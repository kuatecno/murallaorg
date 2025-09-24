/**
 * Individual Expense API
 * Handles CRUD operations for a specific expense
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/expenses/[id]
 * Get a specific expense with all related data
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        status: true,
        paymentAccount: true,
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            rut: true
          }
        },
        taxDocument: {
          select: {
            id: true,
            folio: true,
            emitterName: true,
            type: true,
            totalAmount: true,
            issuedAt: true
          }
        },
        reimbursement: {
          select: {
            id: true,
            description: true,
            status: true,
            totalAmount: true
          }
        }
      }
    });

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: expense
    });

  } catch (error) {
    console.error('Error fetching expense:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch expense',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/expenses/[id]
 * Update an expense
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      date,
      supplier,
      description,
      amount,
      currency,
      documentType,
      documentNumber,
      thirdPartyDocType,
      thirdPartyDocNumber,
      notes,
      paymentType,
      paymentAccountId,
      staffId,
      isCompanyExpense,
      excludeFromReports,
      categoryId,
      statusId
    } = body;

    // Validate payment type logic
    if (paymentType === 'COMPANY_ACCOUNT' && !paymentAccountId) {
      return NextResponse.json(
        { error: 'paymentAccountId is required when paymentType is COMPANY_ACCOUNT' },
        { status: 400 }
      );
    }

    if (paymentType === 'EMPLOYEE_PAID' && !staffId) {
      return NextResponse.json(
        { error: 'staffId is required when paymentType is EMPLOYEE_PAID' },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        supplier,
        description,
        amount: amount ? parseFloat(amount) : undefined,
        currency,
        documentType,
        documentNumber,
        thirdPartyDocType,
        thirdPartyDocNumber,
        notes,
        paymentType,
        paymentAccountId: paymentType === 'COMPANY_ACCOUNT' ? paymentAccountId : null,
        staffId: paymentType === 'EMPLOYEE_PAID' ? staffId : null,
        isCompanyExpense,
        excludeFromReports,
        categoryId,
        statusId
      },
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
        },
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
      data: expense
    });

  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      {
        error: 'Failed to update expense',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/expenses/[id]
 * Delete an expense
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if expense is part of a reimbursement
    const expense = await prisma.expense.findUnique({
      where: { id },
      select: { reimbursementId: true }
    });

    if (expense?.reimbursementId) {
      return NextResponse.json(
        { error: 'Cannot delete expense that is part of a reimbursement' },
        { status: 400 }
      );
    }

    await prisma.expense.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete expense',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}