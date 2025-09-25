/**
 * Employee Reimbursements API
 * Handles CRUD operations for employee reimbursements
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/reimbursements
 * Get all reimbursements with filtering options
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

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

    // Build where conditions
    const where: any = { tenantId };
    if (staffId) where.staffId = staffId;
    if (status) where.status = status;

    const [reimbursements, total] = await Promise.all([
      prisma.employeeReimbursement.findMany({
        where,
        include: {
          staff: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              rut: true
            }
          },
          paymentAccount: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          expenses: {
            include: {
              category: true,
              taxDocument: {
                select: {
                  id: true,
                  folio: true,
                  emitterName: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.employeeReimbursement.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        reimbursements,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching reimbursements:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch reimbursements',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reimbursements
 * Create a new reimbursement (automatically includes eligible expenses)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffId, description, expenseIds } = body;

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

    // Validate required fields
    if (!staffId) {
      return NextResponse.json(
        { error: 'staffId is required' },
        { status: 400 }
      );
    }

    // Get expenses to include in reimbursement
    let expensesToInclude;

    if (expenseIds && expenseIds.length > 0) {
      // Use specified expenses
      expensesToInclude = await prisma.expense.findMany({
        where: {
          id: { in: expenseIds },
          staffId,
          paymentType: 'EMPLOYEE_PAID',
          reimbursementId: null, // Not already in a reimbursement
          tenantId
        }
      });
    } else {
      // Get all unreimbursed expenses for this staff member
      expensesToInclude = await prisma.expense.findMany({
        where: {
          staffId,
          paymentType: 'EMPLOYEE_PAID',
          reimbursementId: null,
          isCompanyExpense: true,
          tenantId
        }
      });
    }

    if (expensesToInclude.length === 0) {
      return NextResponse.json(
        { error: 'No eligible expenses found for reimbursement' },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = expensesToInclude.reduce((sum, expense) => sum + Number(expense.amount), 0);

    // Create reimbursement
    const reimbursement = await prisma.employeeReimbursement.create({
      data: {
        staffId,
        description: description || `Reimbursement for ${expensesToInclude.length} expense(s)`,
        totalAmount,
        currency: 'CLP',
        tenantId
      }
    });

    // Update expenses to link to this reimbursement
    await prisma.expense.updateMany({
      where: {
        id: { in: expensesToInclude.map(e => e.id) }
      },
      data: {
        reimbursementId: reimbursement.id
      }
    });

    // Return reimbursement with included expenses
    const completeReimbursement = await prisma.employeeReimbursement.findUnique({
      where: { id: reimbursement.id },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            rut: true
          }
        },
        expenses: {
          include: {
            category: true,
            taxDocument: {
              select: {
                id: true,
                folio: true,
                emitterName: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: completeReimbursement
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating reimbursement:', error);
    return NextResponse.json(
      {
        error: 'Failed to create reimbursement',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}