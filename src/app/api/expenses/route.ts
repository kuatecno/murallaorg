/**
 * Expenses API
 * Handles CRUD operations for expenses with payment tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/expenses
 * Get all expenses for the tenant with filtering options
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentType = searchParams.get('paymentType');
    const categoryId = searchParams.get('categoryId');
    const staffId = searchParams.get('staffId');
    const isCompanyExpense = searchParams.get('isCompanyExpense');
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
          subdomain: 'default',
          isActive: true
        }
      });
    }
    const tenantId = firstTenant.id;

    // Build where conditions
    const where: any = {
      tenantId,
      excludeFromReports: false
    };

    if (paymentType) where.paymentType = paymentType;
    if (categoryId) where.categoryId = categoryId;
    if (staffId) where.staffId = staffId;
    if (isCompanyExpense !== null) where.isCompanyExpense = isCompanyExpense === 'true';

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
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
          },
          reimbursement: {
            select: {
              id: true,
              description: true,
              status: true
            }
          }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      prisma.expense.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        expenses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching expenses:', error);
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
 * POST /api/expenses
 * Create a new expense
 */
export async function POST(request: NextRequest) {
  try {
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
      categoryId,
      statusId,
      taxDocumentId
    } = body;

    // TODO: Get tenantId from authentication context
    // For now, using the first available tenant or create a default one
    let firstTenant = await prisma.tenant.findFirst();
    if (!firstTenant) {
      // Create a default tenant if none exists
      firstTenant = await prisma.tenant.create({
        data: {
          name: 'Default Tenant',
          subdomain: 'default',
          isActive: true
        }
      });
    }
    const tenantId = firstTenant.id;

    // Validate required fields
    if (!date || !supplier || !description || !amount || !paymentType || !categoryId || !statusId) {
      return NextResponse.json(
        { error: 'Required fields: date, supplier, description, amount, paymentType, categoryId, statusId' },
        { status: 400 }
      );
    }

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

    const expense = await prisma.expense.create({
      data: {
        date: new Date(date),
        supplier,
        description,
        amount: parseFloat(amount),
        currency: currency || 'CLP',
        documentType: documentType || 'OTRO',
        documentNumber,
        thirdPartyDocType,
        thirdPartyDocNumber,
        notes,
        paymentType,
        paymentAccountId,
        staffId,
        isCompanyExpense: isCompanyExpense !== false,
        categoryId,
        statusId,
        taxDocumentId,
        isFromInvoice: !!taxDocumentId,
        tenantId
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
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      {
        error: 'Failed to create expense',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}