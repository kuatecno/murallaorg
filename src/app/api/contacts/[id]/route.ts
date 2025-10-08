/**
 * Individual Contact API
 * GET /api/contacts/[id] - Get contact by ID
 * PUT /api/contacts/[id] - Update contact
 * DELETE /api/contacts/[id] - Delete contact (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/contacts/[id]
 * Fetch single contact with all relations
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant ID' }, { status: 400 });
    }

    const contact = await prisma.contact.findFirst({
      where: {
        id: params.id,
        tenantId,
      },
      include: {
        staffRelations: {
          include: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                position: true,
              },
            },
          },
        },
        salesTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
        purchaseOrders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            salesTransactions: true,
            purchaseOrders: true,
            products: true,
          },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/contacts/[id]
 * Update contact information
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant ID' }, { status: 400 });
    }

    const body = await request.json();

    // Verify contact exists and belongs to tenant
    const existingContact = await prisma.contact.findFirst({
      where: {
        id: params.id,
        tenantId,
      },
    });

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Check if code is being changed and if it conflicts with another contact
    if (body.code && body.code !== existingContact.code) {
      const codeExists = await prisma.contact.findFirst({
        where: {
          tenantId,
          code: body.code,
          id: { not: params.id },
        },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: 'Contact with this code already exists' },
          { status: 409 }
        );
      }
    }

    const updatedContact = await prisma.contact.update({
      where: { id: params.id },
      data: {
        code: body.code,
        name: body.name,
        contactType: body.contactType,
        rut: body.rut || null,
        email: body.email || null,
        phone: body.phone || null,
        contactName: body.contactName || null,
        address: body.address || null,
        city: body.city || null,
        country: body.country || null,
        creditLimit: body.creditLimit !== undefined ? body.creditLimit : null,
        paymentTerms: body.paymentTerms || null,
        rating: body.rating !== undefined ? body.rating : null,
        isActive: body.isActive !== undefined ? body.isActive : true,
        metadata: body.metadata || existingContact.metadata,
      },
    });

    return NextResponse.json(updatedContact);
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contacts/[id]
 * Soft delete contact (set isActive to false)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant ID' }, { status: 400 });
    }

    // Verify contact exists and belongs to tenant
    const existingContact = await prisma.contact.findFirst({
      where: {
        id: params.id,
        tenantId,
      },
    });

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Soft delete
    const deletedContact = await prisma.contact.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Contact deactivated successfully',
      contact: deletedContact,
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
