/**
 * Contacts API
 * Unified endpoint for managing all business contacts:
 * Customers, Suppliers, Brands, Agents, Couriers, and Influencers
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/contacts
 * List all contacts with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const contactType = searchParams.get('type');
    const search = searchParams.get('search');

    const contacts = await prisma.contact.findMany({
      where: {
        tenantId,
        contactType: contactType || undefined,
        isActive: true,
        OR: search
          ? [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
              { rut: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        staffRelations: {
          include: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            salesTransactions: true,
            purchaseOrders: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contacts
 * Create a new contact
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      code,
      name,
      contactType,
      rut,
      email,
      phone,
      contactName,
      address,
      city,
      country,
      creditLimit,
      paymentTerms,
      rating,
      metadata,
    } = body;

    // Validate required fields
    if (!code || !name || !contactType) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, contactType' },
        { status: 400 }
      );
    }

    // Check if code already exists for this tenant
    const existingContact = await prisma.contact.findFirst({
      where: {
        tenantId,
        code,
      },
    });

    if (existingContact) {
      return NextResponse.json(
        { error: 'Contact with this code already exists' },
        { status: 409 }
      );
    }

    const contact = await prisma.contact.create({
      data: {
        code,
        name,
        contactType,
        rut,
        email,
        phone,
        contactName,
        address,
        city,
        country,
        creditLimit,
        paymentTerms,
        rating,
        metadata: metadata || {},
        tenantId,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}
