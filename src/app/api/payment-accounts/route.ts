/**
 * Payment Accounts API
 * Handles CRUD operations for company payment accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/payment-accounts
 * Get all payment accounts for the tenant
 */
export async function GET(request: NextRequest) {
  try {
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

    const accounts = await prisma.paymentAccount.findMany({
      where: {
        tenantId,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: accounts
    });

  } catch (error) {
    console.error('Error fetching payment accounts:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch payment accounts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payment-accounts
 * Create a new payment account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, accountNumber, bank, currency, balance } = body;

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
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    const account = await prisma.paymentAccount.create({
      data: {
        name,
        type,
        accountNumber,
        bank,
        currency: currency || 'CLP',
        balance: balance ? parseFloat(balance) : null,
        tenantId
      }
    });

    return NextResponse.json({
      success: true,
      data: account
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating payment account:', error);
    return NextResponse.json(
      {
        error: 'Failed to create payment account',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}