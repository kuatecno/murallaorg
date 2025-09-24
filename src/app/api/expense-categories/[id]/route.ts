/**
 * Individual Expense Category API
 * Handles CRUD operations for a specific expense category
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/expense-categories/[id]
 * Update an expense category
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, emoji, description, color, isActive } = body;

    const category = await prisma.expenseCategory.update({
      where: { id },
      data: {
        name,
        emoji,
        description,
        color,
        isActive
      }
    });

    return NextResponse.json({
      success: true,
      data: category
    });

  } catch (error) {
    console.error('Error updating expense category:', error);
    return NextResponse.json(
      {
        error: 'Failed to update expense category',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/expense-categories/[id]
 * Soft delete an expense category (set isActive to false)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const category = await prisma.expenseCategory.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      data: category
    });

  } catch (error) {
    console.error('Error deleting expense category:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete expense category',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}