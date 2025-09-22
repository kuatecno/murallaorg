/**
 * Document Web Preview API
 * GET /api/invoices/[id]/preview
 * Returns formatted document data for web preview display
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invoices/[id]/preview
 * Get formatted document data for web preview
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Fetch invoice with all related data
    const invoice = await prisma.taxDocument.findUnique({
      where: { id },
      include: {
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

    // Extract detailed data from rawResponse
    const rawData = invoice.rawResponse as any;
    const detailedData = rawData?.detailedData;
    const fullDocument = detailedData?.fullDocument;

    // Format the response for web preview
    const previewData = {
      // Basic document info
      document: {
        id: invoice.id,
        type: invoice.type,
        folio: invoice.folio,
        documentCode: invoice.documentCode,
        status: invoice.status,
        issuedAt: invoice.issuedAt,
        createdAt: invoice.createdAt,
        currency: invoice.currency
      },

      // Document header from OpenFactura JSON
      header: fullDocument?.Encabezado || {},

      // Emitter information (enhanced with OpenFactura data)
      emitter: {
        rut: invoice.emitterRUT,
        name: invoice.emitterName,
        // Enhanced data from OpenFactura
        businessLine: detailedData?.emitter?.businessLine || fullDocument?.Encabezado?.Emisor?.GiroEmis,
        email: detailedData?.emitter?.email || fullDocument?.Encabezado?.Emisor?.CorreoEmisor,
        phone: detailedData?.emitter?.phone || fullDocument?.Encabezado?.Emisor?.Telefono,
        address: detailedData?.emitter?.address || fullDocument?.Encabezado?.Emisor?.DirOrigen,
        commune: detailedData?.emitter?.commune || fullDocument?.Encabezado?.Emisor?.CmnaOrigen,
        economicActivity: detailedData?.emitter?.economicActivity || fullDocument?.Encabezado?.Emisor?.Acteco
      },

      // Receiver information (enhanced with OpenFactura data)
      receiver: {
        rut: invoice.receiverRUT,
        name: invoice.receiverName,
        // Enhanced data from OpenFactura
        businessLine: detailedData?.receiver?.businessLine || fullDocument?.Encabezado?.Receptor?.GiroRecep,
        contact: detailedData?.receiver?.contact || fullDocument?.Encabezado?.Receptor?.Contacto,
        address: detailedData?.receiver?.address || fullDocument?.Encabezado?.Receptor?.DirRecep,
        commune: detailedData?.receiver?.commune || fullDocument?.Encabezado?.Receptor?.CmnaRecep
      },

      // Financial totals
      totals: {
        netAmount: Number(invoice.netAmount),
        taxAmount: Number(invoice.taxAmount),
        totalAmount: Number(invoice.totalAmount),
        // Enhanced totals from OpenFactura
        exemptAmount: detailedData?.totals?.exemptAmount || fullDocument?.Encabezado?.Totales?.MntExe || 0,
        additionalTaxes: detailedData?.totals?.additionalTaxes || fullDocument?.Encabezado?.Totales?.ImptoReten || []
      },

      // Line items (from database with enhanced details)
      items: invoice.items.map(item => ({
        id: item.id,
        lineNumber: item.lineNumber || 0,
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        unitOfMeasure: item.unitOfMeasure,
        productCode: item.productCode,
        exemptAmount: item.exemptAmount ? Number(item.exemptAmount) : 0,
        discount: item.discount ? Number(item.discount) : 0,
        // Additional details from rawItem if available
        rawItem: item.rawItem
      })),

      // OpenFactura reception info
      reception: {
        siiDate: detailedData?.documentInfo?.receptionDateSII || rawData?.FchRecepSII,
        openFacturaDate: detailedData?.documentInfo?.receptionDateOF || rawData?.FchRecepOF,
        status: detailedData?.documentInfo?.status
      },

      // Complete metadata for debugging/advanced view
      metadata: {
        hasLineItems: invoice.items.length > 0,
        hasDetailedData: !!detailedData,
        documentTypeName: rawData?.metadata?.documentTypeName,
        isExempt: rawData?.metadata?.isExempt || false,
        lastUpdated: invoice.updatedAt
      }
    };

    return NextResponse.json({
      success: true,
      data: previewData
    });

  } catch (error) {
    console.error('Error generating document preview:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate document preview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}