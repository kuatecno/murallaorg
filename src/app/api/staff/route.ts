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
        role: true,
        isActive: true,
        salary: true,
        salaryType: true,
        hourlyRate: true,
        vacationDaysTotal: true,
        vacationDaysUsed: true,
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

/**
 * POST /api/staff
 * Create a new staff member
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      salary,
      salaryType,
      hourlyRate,
      vacationDaysTotal
    } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { success: false, error: 'firstName, lastName, and email are required' },
        { status: 400 }
      );
    }

    const staff = await prisma.staff.create({
      data: {
        tenantId,
        firstName,
        lastName,
        email,
        phone: phone || null,
        role: role || 'EMPLOYEE',
        isActive: true,
        salary: salary ? parseFloat(salary) : null,
        salaryType: salaryType || 'MONTHLY',
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        vacationDaysTotal: vacationDaysTotal ? parseInt(vacationDaysTotal) : 15,
        vacationDaysUsed: 0
      }
    });

    return NextResponse.json({
      success: true,
      data: staff
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create staff member' },
      { status: 500 }
    );
  }
}