/**
 * Database Seed API
 * POST /api/seed - Run database seed (one-time setup)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Simple security check - require a secret key
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.SEED_SECRET || 'your-secret-key-here';

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant ID' }, { status: 400 });
    }

    console.log('Starting ContactTypeConfig seed for tenant:', tenantId);

    // Create default contact type configurations
    const contactTypeConfigs = [
      {
        name: 'CUSTOMER',
        label: 'Customer',
        description: 'Regular customers who purchase products',
        icon: '👤',
        color: 'bg-blue-100 text-blue-800',
        isSystem: true,
        order: 1,
        fields: [
          { fieldName: 'code', fieldLabel: 'Code', fieldType: 'text', isRequired: true, isVisible: true, order: 1, placeholder: 'CLI001' },
          { fieldName: 'name', fieldLabel: 'Name', fieldType: 'text', isRequired: true, isVisible: true, order: 2, placeholder: 'Company or Person Name' },
          { fieldName: 'rut', fieldLabel: 'RUT', fieldType: 'text', isRequired: false, isVisible: true, order: 3, placeholder: '12345678-9' },
          { fieldName: 'email', fieldLabel: 'Email', fieldType: 'email', isRequired: false, isVisible: true, order: 4 },
          { fieldName: 'phone', fieldLabel: 'Phone', fieldType: 'phone', isRequired: false, isVisible: true, order: 5 },
          { fieldName: 'address', fieldLabel: 'Address', fieldType: 'text', isRequired: false, isVisible: true, order: 6 },
          { fieldName: 'city', fieldLabel: 'City', fieldType: 'text', isRequired: false, isVisible: true, order: 7 },
          { fieldName: 'creditLimit', fieldLabel: 'Credit Limit', fieldType: 'number', isRequired: false, isVisible: true, order: 8 },
        ],
      },
      {
        name: 'SUPPLIER',
        label: 'Supplier',
        description: 'Vendors and suppliers',
        icon: '🏭',
        color: 'bg-green-100 text-green-800',
        isSystem: true,
        order: 2,
        fields: [
          { fieldName: 'code', fieldLabel: 'Code', fieldType: 'text', isRequired: true, isVisible: true, order: 1, placeholder: 'SUP001' },
          { fieldName: 'name', fieldLabel: 'Name', fieldType: 'text', isRequired: true, isVisible: true, order: 2 },
          { fieldName: 'rut', fieldLabel: 'RUT', fieldType: 'text', isRequired: false, isVisible: true, order: 3 },
          { fieldName: 'contactName', fieldLabel: 'Contact Person', fieldType: 'text', isRequired: false, isVisible: true, order: 4 },
          { fieldName: 'email', fieldLabel: 'Email', fieldType: 'email', isRequired: false, isVisible: true, order: 5 },
          { fieldName: 'phone', fieldLabel: 'Phone', fieldType: 'phone', isRequired: false, isVisible: true, order: 6 },
          { fieldName: 'address', fieldLabel: 'Address', fieldType: 'text', isRequired: false, isVisible: true, order: 7 },
          { fieldName: 'paymentTerms', fieldLabel: 'Payment Terms', fieldType: 'select', isRequired: false, isVisible: true, order: 8, options: JSON.stringify(['cash', '15_days', '30_days', '60_days', '90_days']) },
        ],
      },
      {
        name: 'BRAND',
        label: 'Brand',
        description: 'Product brands and manufacturers',
        icon: '🏷️',
        color: 'bg-purple-100 text-purple-800',
        isSystem: true,
        order: 3,
        fields: [
          { fieldName: 'code', fieldLabel: 'Code', fieldType: 'text', isRequired: true, isVisible: true, order: 1 },
          { fieldName: 'name', fieldLabel: 'Brand Name', fieldType: 'text', isRequired: true, isVisible: true, order: 2 },
          { fieldName: 'contactName', fieldLabel: 'Contact Person', fieldType: 'text', isRequired: false, isVisible: true, order: 3 },
          { fieldName: 'email', fieldLabel: 'Email', fieldType: 'email', isRequired: false, isVisible: true, order: 4 },
          { fieldName: 'phone', fieldLabel: 'Phone', fieldType: 'phone', isRequired: false, isVisible: true, order: 5 },
        ],
      },
    ];

    const results = [];
    for (const config of contactTypeConfigs) {
      const result = await prisma.contactTypeConfig.upsert({
        where: { tenantId_name: { tenantId, name: config.name } },
        update: {},
        create: {
          ...config,
          tenantId,
          fields: {
            create: config.fields.map(field => ({
              ...field,
              tenantId,
            })),
          },
        },
      });
      results.push(result);
    }

    return NextResponse.json({
      success: true,
      message: 'Contact type configurations seeded successfully',
      created: results.length,
      types: results.map(r => r.name),
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      {
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to run database seed',
    note: 'Requires Authorization header with Bearer token',
  });
}
