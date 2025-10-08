/**
 * Contact Type Configuration API
 * GET /api/contact-types - List all contact types with their field configurations
 * POST /api/contact-types - Create a new custom contact type
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/contact-types
 * List all contact types for a tenant with their field configurations
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant ID' }, { status: 400 });
    }

    const contactTypes = await prisma.contactTypeConfig.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        fields: {
          where: { isVisible: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(contactTypes);
  } catch (error) {
    console.error('Error fetching contact types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact types' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contact-types
 * Create a new custom contact type
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, label, description, icon, color, fields } = body;

    // Validate required fields
    if (!name || !label) {
      return NextResponse.json(
        { error: 'Missing required fields: name, label' },
        { status: 400 }
      );
    }

    // Check if contact type with this name already exists
    const existing = await prisma.contactTypeConfig.findFirst({
      where: {
        tenantId,
        name: name.toUpperCase(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Contact type with this name already exists' },
        { status: 409 }
      );
    }

    // Get the highest order number
    const highestOrder = await prisma.contactTypeConfig.findFirst({
      where: { tenantId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    // Create contact type
    const contactType = await prisma.contactTypeConfig.create({
      data: {
        name: name.toUpperCase(),
        label,
        description,
        icon: icon || '📋',
        color: color || 'bg-gray-100 text-gray-800',
        isSystem: false,
        order: (highestOrder?.order || 0) + 1,
        tenantId,
        fields: {
          create: fields?.map((field: any, index: number) => ({
            fieldName: field.fieldName,
            fieldLabel: field.fieldLabel,
            fieldType: field.fieldType || 'text',
            isRequired: field.isRequired || false,
            isVisible: field.isVisible !== false,
            order: field.order || index,
            placeholder: field.placeholder,
            helpText: field.helpText,
            validation: field.validation,
            options: field.options,
            defaultValue: field.defaultValue,
            tenantId,
          })) || [],
        },
      },
      include: {
        fields: true,
      },
    });

    return NextResponse.json(contactType, { status: 201 });
  } catch (error) {
    console.error('Error creating contact type:', error);
    return NextResponse.json(
      { error: 'Failed to create contact type' },
      { status: 500 }
    );
  }
}
