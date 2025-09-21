/**
 * Individual Invoice API Routes
 * GET /api/invoices/[id] - Get single invoice
 * PUT /api/invoices/[id] - Update invoice
 * DELETE /api/invoices/[id] - Cancel/void invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma, TaxDocumentStatus } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invoices/[id]
 * Get single invoice by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    const invoice = await prisma.taxDocument.findUnique({
      where: { id },
      include: {
        transaction: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                rut: true,
                phone: true,
                address: true,
              }
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    sku: true,
                    name: true,
                    unit: true,
                  }
                }
              }
            }
          }
        },
        items: true,
        tenant: {
          select: {
            id: true,
            name: true,
            rut: true,
            address: true,
            phone: true,
            email: true,
          }
        }
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Transform response
    const transformedInvoice = {
      id: invoice.id,
      type: invoice.type,
      folio: invoice.folio,
      documentCode: invoice.documentCode,
      emitterRUT: invoice.emitterRUT,
      emitterName: invoice.emitterName,
      receiverRUT: invoice.receiverRUT,
      receiverName: invoice.receiverName,
      netAmount: invoice.netAmount ? Number(invoice.netAmount) : null,
      taxAmount: invoice.taxAmount ? Number(invoice.taxAmount) : null,
      totalAmount: invoice.totalAmount ? Number(invoice.totalAmount) : null,
      currency: invoice.currency,
      issuedAt: invoice.issuedAt,
      status: invoice.status,
      pdfUrl: invoice.pdfUrl,
      xmlUrl: invoice.xmlUrl,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      tenant: invoice.tenant,
      customer: invoice.transaction?.customer || null,
      transaction: invoice.transaction ? {
        id: invoice.transaction.id,
        type: invoice.transaction.type,
        status: invoice.transaction.status,
        paymentStatus: invoice.transaction.paymentStatus,
        paymentMethod: invoice.transaction.paymentMethod,
        items: invoice.transaction.items || []
      } : null,
      items: invoice.items.map(item => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    };

    return NextResponse.json({
      data: transformedInvoice
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/invoices/[id]
 * Update invoice (only allowed for DRAFT status)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Check if invoice exists and is in DRAFT status
    const existingInvoice = await prisma.taxDocument.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (existingInvoice.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft invoices can be updated' },
        { status: 400 }
      );
    }

    // If items are being updated, validate them
    if (body.items) {
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json(
          { error: 'At least one item is required' },
          { status: 400 }
        );
      }

      // Validate each item
      for (const item of body.items) {
        if (!item.productName || !item.quantity || !item.unitPrice) {
          return NextResponse.json(
            { error: 'Each item must have productName, quantity, and unitPrice' },
            { status: 400 }
          );
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          return NextResponse.json(
            { error: 'Item quantity must be a positive number' },
            { status: 400 }
          );
        }
        if (typeof item.unitPrice !== 'number' || item.unitPrice <= 0) {
          return NextResponse.json(
            { error: 'Item unit price must be a positive number' },
            { status: 400 }
          );
        }
      }
    }

    // Prepare update data
    const updateData: any = {};

    // Update basic fields if provided
    if (body.receiverRUT !== undefined) updateData.receiverRUT = body.receiverRUT;
    if (body.receiverName !== undefined) updateData.receiverName = body.receiverName;
    if (body.emitterRUT !== undefined) updateData.emitterRUT = body.emitterRUT;
    if (body.emitterName !== undefined) updateData.emitterName = body.emitterName;
    if (body.currency !== undefined) updateData.currency = body.currency;

    // If items are being updated, recalculate totals
    if (body.items) {
      const items = body.items.map((item: any) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(item.unitPrice),
        totalPrice: new Prisma.Decimal(item.quantity * item.unitPrice),
      }));

      const netAmount = items.reduce((sum: Prisma.Decimal, item: any) => sum.plus(item.totalPrice), new Prisma.Decimal(0));
      const taxRate = 0.19; // Chilean IVA
      const taxAmount = netAmount.times(taxRate);
      const totalAmount = netAmount.plus(taxAmount);

      updateData.netAmount = netAmount;
      updateData.taxAmount = taxAmount;
      updateData.totalAmount = totalAmount;

      // Update items
      updateData.items = {
        deleteMany: {}, // Delete all existing items
        create: items.map((item: any) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        }))
      };
    }

    // Update the invoice
    const updatedInvoice = await prisma.taxDocument.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        transaction: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                rut: true,
              }
            }
          }
        }
      },
    });

    // Transform response
    const transformedInvoice = {
      id: updatedInvoice.id,
      type: updatedInvoice.type,
      folio: updatedInvoice.folio,
      documentCode: updatedInvoice.documentCode,
      emitterRUT: updatedInvoice.emitterRUT,
      emitterName: updatedInvoice.emitterName,
      receiverRUT: updatedInvoice.receiverRUT,
      receiverName: updatedInvoice.receiverName,
      netAmount: Number(updatedInvoice.netAmount),
      taxAmount: Number(updatedInvoice.taxAmount),
      totalAmount: Number(updatedInvoice.totalAmount),
      currency: updatedInvoice.currency,
      issuedAt: updatedInvoice.issuedAt,
      status: updatedInvoice.status,
      pdfUrl: updatedInvoice.pdfUrl,
      xmlUrl: updatedInvoice.xmlUrl,
      createdAt: updatedInvoice.createdAt,
      updatedAt: updatedInvoice.updatedAt,
      customer: updatedInvoice.transaction?.customer || null,
      items: updatedInvoice.items.map(item => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    };

    return NextResponse.json({
      message: 'Invoice updated successfully',
      data: transformedInvoice
    });

  } catch (error) {
    console.error('Error updating invoice:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invoices/[id]
 * Cancel/void invoice (sets status to CANCELLED)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Check if invoice exists
    const existingInvoice = await prisma.taxDocument.findUnique({
      where: { id },
      select: { id: true, status: true, folio: true }
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (existingInvoice.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Invoice is already cancelled' },
        { status: 400 }
      );
    }

    // Update status to CANCELLED
    const cancelledInvoice = await prisma.taxDocument.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      },
      select: {
        id: true,
        status: true,
        folio: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      message: 'Invoice cancelled successfully',
      data: {
        id: cancelledInvoice.id,
        status: cancelledInvoice.status,
        folio: cancelledInvoice.folio,
        updatedAt: cancelledInvoice.updatedAt
      }
    });

  } catch (error) {
    console.error('Error cancelling invoice:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel invoice' },
      { status: 500 }
    );
  }
}