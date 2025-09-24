/**
 * Expense Categories API
 * Handles CRUD operations for expense categories
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/expense-categories
 * Get all expense categories for the tenant
 */
export async function GET(request: NextRequest) {
  try {
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

    const categories = await prisma.expenseCategory.findMany({
      where: {
        tenantId,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch expense categories',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/expense-categories
 * Create a new expense category
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, emoji, description, color } = body;

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

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const category = await prisma.expenseCategory.create({
      data: {
        name,
        emoji,
        description,
        color: color || '#64748B',
        tenantId
      }
    });

    return NextResponse.json({
      success: true,
      data: category
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating expense category:', error);
    return NextResponse.json(
      {
        error: 'Failed to create expense category',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}