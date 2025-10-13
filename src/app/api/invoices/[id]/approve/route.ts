/**
 * Invoice Approval API
 * POST /api/invoices/[id]/approve - Convert draft invoice to issued status
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/invoices/[id]/approve
 * Convert draft invoice to issued status
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Check if invoice exists and is in DRAFT status
    const existingInvoice = await prisma.taxDocument.findUnique({
      where: { id },
      include: {
        items: true,
        tenant: {
          select: { id: true, name: true, rut: true }
        }
      }
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (existingInvoice.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft invoices can be approved' },
        { status: 400 }
      );
    }

    // Validate invoice has required data for approval
    if (!existingInvoice.receiverRUT || !existingInvoice.receiverName) {
      return NextResponse.json(
        { error: 'Invoice must have receiver RUT and name to be approved' },
        { status: 400 }
      );
    }

    if (!existingInvoice.items || existingInvoice.items.length === 0) {
      return NextResponse.json(
        { error: 'Invoice must have at least one item to be approved' },
        { status: 400 }
      );
    }

    if (!existingInvoice.totalAmount || existingInvoice.totalAmount.equals(0)) {
      return NextResponse.json(
        { error: 'Invoice must have a total amount greater than zero' },
        { status: 400 }
      );
    }

    // Generate folio number if not present
    let folio = existingInvoice.folio;
    if (!folio) {
      // Get the next folio number for this tenant and document type
      const lastInvoice = await prisma.taxDocument.findFirst({
        where: {
          tenantId: existingInvoice.tenantId,
          type: existingInvoice.type,
          status: 'ISSUED',
          folio: { not: null }
        },
        orderBy: { folio: 'desc' },
        select: { folio: true }
      });

      const lastFolioNumber = lastInvoice?.folio ? parseInt(lastInvoice.folio) : 0;
      folio = (lastFolioNumber + 1).toString().padStart(6, '0');
    }

    // Update invoice to ISSUED status
    const approvedInvoice = await prisma.taxDocument.update({
      where: { id },
      data: {
        status: 'ISSUED',
        folio,
        issuedAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        items: true,
        transaction: {
          include: {
            contact: {
              select: {
                id: true,
                name: true,
                email: true,
                rut: true,
                phone: true,
              }
            }
          }
        },
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

    // TODO: Here we would integrate with OpenFactura/Haulmer API to submit to SII
    // For now, we'll just update the status and generate document code
    let documentCode = approvedInvoice.documentCode;
    if (!documentCode) {
      // Generate document code based on type
      switch (approvedInvoice.type) {
        case 'BOLETA':
          documentCode = 39;
          break;
        case 'FACTURA':
          documentCode = 33;
          break;
        case 'NOTA_CREDITO':
          documentCode = 61;
          break;
        case 'NOTA_DEBITO':
          documentCode = 56;
          break;
        case 'GUIA_DESPACHO':
          documentCode = 52;
          break;
        default:
          documentCode = 33; // Default to FACTURA
      }

      // Update with document code
      await prisma.taxDocument.update({
        where: { id },
        data: { documentCode }
      });
    }

    // Transform response
    const transformedInvoice = {
      id: approvedInvoice.id,
      type: approvedInvoice.type,
      folio: approvedInvoice.folio,
      documentCode: documentCode,
      emitterRUT: approvedInvoice.emitterRUT,
      emitterName: approvedInvoice.emitterName,
      receiverRUT: approvedInvoice.receiverRUT,
      receiverName: approvedInvoice.receiverName,
      netAmount: Number(approvedInvoice.netAmount),
      taxAmount: Number(approvedInvoice.taxAmount),
      totalAmount: Number(approvedInvoice.totalAmount),
      currency: approvedInvoice.currency,
      issuedAt: approvedInvoice.issuedAt,
      status: approvedInvoice.status,
      pdfUrl: approvedInvoice.pdfUrl,
      xmlUrl: approvedInvoice.xmlUrl,
      createdAt: approvedInvoice.createdAt,
      updatedAt: approvedInvoice.updatedAt,
      tenant: approvedInvoice.tenant,
      customer: approvedInvoice.transaction?.contact || null,
      items: approvedInvoice.items.map(item => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    };

    return NextResponse.json({
      message: 'Invoice approved and issued successfully',
      data: transformedInvoice
    });

  } catch (error) {
    console.error('Error approving invoice:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to approve invoice' },
      { status: 500 }
    );
  }
}