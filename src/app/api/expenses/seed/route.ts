/**
 * Expense System Seed API
 * Creates default categories, statuses, and payment accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DEFAULT_CATEGORIES = [
  { name: 'Travel & Transport', emoji: '🚗', color: '#3B82F6', description: 'Vehicle expenses, fuel, parking, public transport' },
  { name: 'Office Supplies', emoji: '📎', color: '#10B981', description: 'Stationery, equipment, printing' },
  { name: 'Food & Entertainment', emoji: '🍽️', color: '#F59E0B', description: 'Business meals, client entertainment' },
  { name: 'Software & Technology', emoji: '💻', color: '#8B5CF6', description: 'Software licenses, tech equipment' },
  { name: 'Marketing & Advertising', emoji: '📢', color: '#EF4444', description: 'Promotional materials, ads, events' },
  { name: 'Professional Services', emoji: '⚖️', color: '#6B7280', description: 'Legal, accounting, consulting' },
  { name: 'Training & Education', emoji: '📚', color: '#14B8A6', description: 'Courses, conferences, training materials' },
  { name: 'Utilities & Communications', emoji: '📞', color: '#F97316', description: 'Phone, internet, utilities' },
  { name: 'Auto-Generated', emoji: '🤖', color: '#3B82F6', description: 'Automatically generated from invoices' },
  { name: 'Other', emoji: '📦', color: '#64748B', description: 'Miscellaneous expenses' }
];

const DEFAULT_STATUSES = [
  { name: 'Pending Review', color: '#F59E0B', isDefault: true },
  { name: 'Approved', color: '#10B981', isDefault: false },
  { name: 'Rejected', color: '#EF4444', isDefault: false },
  { name: 'Paid', color: '#6B7280', isDefault: false },
  { name: 'Draft', color: '#8B5CF6', isDefault: false }
];

const DEFAULT_PAYMENT_ACCOUNTS = [
  { name: 'Cuenta Corriente Principal', type: 'BANK_ACCOUNT', bank: 'Banco Estado', currency: 'CLP' },
  { name: 'Tarjeta Crédito Empresa', type: 'CREDIT_CARD', bank: 'Banco de Chile', currency: 'CLP' },
  { name: 'Caja Chica', type: 'CASH', currency: 'CLP' }
];

/**
 * POST /api/expenses/seed
 * Create default categories, statuses, and payment accounts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { force = false } = body;

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

    const results = {
      categories: { created: 0, skipped: 0 },
      statuses: { created: 0, skipped: 0 },
      paymentAccounts: { created: 0, skipped: 0 }
    };

    // Create default categories
    for (const categoryData of DEFAULT_CATEGORIES) {
      try {
        const existing = await prisma.expenseCategory.findFirst({
          where: { tenantId, name: categoryData.name }
        });

        if (existing && !force) {
          results.categories.skipped++;
          continue;
        }

        if (existing && force) {
          await prisma.expenseCategory.update({
            where: { id: existing.id },
            data: categoryData
          });
        } else {
          await prisma.expenseCategory.create({
            data: { ...categoryData, tenantId }
          });
        }

        results.categories.created++;
      } catch (error) {
        console.error(`Error creating category ${categoryData.name}:`, error);
      }
    }

    // Create default statuses
    for (const statusData of DEFAULT_STATUSES) {
      try {
        const existing = await prisma.expenseStatus.findFirst({
          where: { tenantId, name: statusData.name }
        });

        if (existing && !force) {
          results.statuses.skipped++;
          continue;
        }

        if (existing && force) {
          await prisma.expenseStatus.update({
            where: { id: existing.id },
            data: statusData
          });
        } else {
          await prisma.expenseStatus.create({
            data: { ...statusData, tenantId }
          });
        }

        results.statuses.created++;
      } catch (error) {
        console.error(`Error creating status ${statusData.name}:`, error);
      }
    }

    // Create default payment accounts
    for (const accountData of DEFAULT_PAYMENT_ACCOUNTS) {
      try {
        const existing = await prisma.paymentAccount.findFirst({
          where: { tenantId, name: accountData.name }
        });

        if (existing && !force) {
          results.paymentAccounts.skipped++;
          continue;
        }

        if (existing && force) {
          await prisma.paymentAccount.update({
            where: { id: existing.id },
            data: accountData
          });
        } else {
          await prisma.paymentAccount.create({
            data: { ...accountData, tenantId }
          });
        }

        results.paymentAccounts.created++;
      } catch (error) {
        console.error(`Error creating payment account ${accountData.name}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Expense system seeded successfully',
      data: results
    });

  } catch (error) {
    console.error('Error seeding expense system:', error);
    return NextResponse.json(
      {
        error: 'Failed to seed expense system',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}