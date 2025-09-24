/**
 * Individual Reimbursement API
 * Handles CRUD operations for a specific employee reimbursement
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/reimbursements/[id]
 * Get a specific reimbursement with all related data
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const reimbursement = await prisma.employeeReimbursement.findUnique({
      where: { id },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            rut: true,
            phone: true
          }
        },
        paymentAccount: {
          select: {
            id: true,
            name: true,
            type: true,
            bank: true
          }
        },
        expenses: {
          include: {
            category: true,
            status: true,
            taxDocument: {
              select: {
                id: true,
                folio: true,
                emitterName: true,
                type: true
              }
            }
          },
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!reimbursement) {
      return NextResponse.json(
        { error: 'Reimbursement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: reimbursement
    });

  } catch (error) {
    console.error('Error fetching reimbursement:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch reimbursement',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reimbursements/[id]
 * Update a reimbursement (mainly for payment processing)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      description,
      status,
      paidDate,
      paidAmount,
      paymentAccountId,
      paymentReference,
      notes
    } = body;

    // If marking as paid, validate required fields
    if (status === 'PAID' && (!paidDate || !paidAmount || !paymentAccountId)) {
      return NextResponse.json(
        { error: 'paidDate, paidAmount, and paymentAccountId are required when marking as PAID' },
        { status: 400 }
      );
    }

    const reimbursement = await prisma.employeeReimbursement.update({
      where: { id },
      data: {
        description,
        status,
        paidDate: paidDate ? new Date(paidDate) : undefined,
        paidAmount: paidAmount ? parseFloat(paidAmount) : undefined,
        paymentAccountId,
        paymentReference,
        notes
      },
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
      }
    });

    return NextResponse.json({
      success: true,
      data: reimbursement
    });

  } catch (error) {
    console.error('Error updating reimbursement:', error);
    return NextResponse.json(
      {
        error: 'Failed to update reimbursement',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reimbursements/[id]
 * Delete a reimbursement (only if not paid)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if reimbursement is already paid
    const reimbursement = await prisma.employeeReimbursement.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!reimbursement) {
      return NextResponse.json(
        { error: 'Reimbursement not found' },
        { status: 404 }
      );
    }

    if (reimbursement.status === 'PAID' || reimbursement.status === 'PARTIALLY_PAID') {
      return NextResponse.json(
        { error: 'Cannot delete a reimbursement that has been paid' },
        { status: 400 }
      );
    }

    // Remove reimbursement link from expenses before deleting
    await prisma.expense.updateMany({
      where: { reimbursementId: id },
      data: { reimbursementId: null }
    });

    await prisma.employeeReimbursement.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Reimbursement deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting reimbursement:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete reimbursement',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}