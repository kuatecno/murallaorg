/**
 * Staff API
 * Handles operations for staff members (extended for expense management)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/staff
 * Get all active staff members with expense-related summaries
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeExpenseSummary = searchParams.get('includeExpenseSummary') === 'true';

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

    const staff = await prisma.staff.findMany({
      where: {
        tenantId,
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        rut: true,
        position: true,
        department: true,
        createdAt: true,
        // Include expense-related data if requested
        ...(includeExpenseSummary && {
          expenses: {
            where: {
              paymentType: 'EMPLOYEE_PAID',
              reimbursementId: null // Unreimbursed expenses
            },
            select: {
              id: true,
              amount: true,
              date: true,
              description: true,
              currency: true
            }
          },
          reimbursements: {
            where: {
              status: { in: ['PENDING', 'APPROVED'] }
            },
            select: {
              id: true,
              totalAmount: true,
              status: true,
              createdAt: true
            }
          }
        })
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    // Calculate expense summaries if requested
    const staffWithSummaries = includeExpenseSummary
      ? staff.map(member => {
          const unreimbursedExpenses = member.expenses || [];
          const pendingReimbursements = member.reimbursements || [];

          const totalUnreimbursed = unreimbursedExpenses.reduce(
            (sum, expense) => sum + Number(expense.amount),
            0
          );

          const totalPendingReimbursement = pendingReimbursements.reduce(
            (sum, reimbursement) => sum + Number(reimbursement.totalAmount),
            0
          );

          return {
            ...member,
            expenseSummary: {
              totalUnreimbursedAmount: totalUnreimbursed,
              totalPendingReimbursement: totalPendingReimbursement,
              totalOwed: totalUnreimbursed + totalPendingReimbursement,
              unreimbursedExpenseCount: unreimbursedExpenses.length,
              pendingReimbursementCount: pendingReimbursements.length
            }
          };
        })
      : staff;

    return NextResponse.json({
      success: true,
      data: staffWithSummaries
    });

  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch staff',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}