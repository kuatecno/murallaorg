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
    let fullDocument = detailedData?.fullDocument || rawData?.json;

    // If no stored JSON data, fetch it directly from OpenFactura API
    if (!fullDocument && process.env.OPENFACTURA_API_KEY) {
      try {
        const detailUrl = `https://api.haulmer.com/v2/dte/document/${invoice.emitterRUT}/${invoice.documentCode}/${invoice.folio}/json`;
        const response = await fetch(detailUrl, {
          headers: { 'apikey': process.env.OPENFACTURA_API_KEY }
        });

        if (response.ok) {
          const apiData = await response.json();
          fullDocument = apiData.json;
        }
      } catch (error) {
        console.warn('Failed to fetch document details from OpenFactura:', error);
      }
    }

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
        rut: fullDocument?.Encabezado?.Receptor?.RUTRecep || invoice.receiverRUT,
        name: fullDocument?.Encabezado?.Receptor?.RznSocRecep || invoice.receiverName,
        // Enhanced data from OpenFactura
        businessLine: fullDocument?.Encabezado?.Receptor?.GiroRecep || detailedData?.receiver?.businessLine,
        contact: fullDocument?.Encabezado?.Receptor?.Contacto || fullDocument?.Encabezado?.Receptor?.CorreoRecep || detailedData?.receiver?.contact,
        address: fullDocument?.Encabezado?.Receptor?.DirRecep || detailedData?.receiver?.address,
        commune: fullDocument?.Encabezado?.Receptor?.CmnaRecep || detailedData?.receiver?.commune
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

      // Line items (extract from JSON if available, fallback to database)
      items: (() => {
        // Try to get line items from the stored JSON first
        const jsonLineItems = fullDocument?.Detalle || rawData?.json?.Detalle;
        if (jsonLineItems && Array.isArray(jsonLineItems)) {
          return jsonLineItems.map((item: any, index: number) => ({
            id: `line-${index}`,
            lineNumber: item.NroLinDet || (index + 1),
            productName: item.DscItem || item.NmbItem || `Item ${index + 1}`,
            description: item.DscItem || item.NmbItem || '',
            quantity: item.QtyItem || 1,
            unitPrice: item.PrcItem || 0,
            totalPrice: item.MontoItem || 0,
            unitOfMeasure: item.UnmdItem || '',
            productCode: item.CdgItem?.VlrCodigo || '',
            exemptAmount: item.MontoExe || 0,
            discount: item.DescuentoMonto || 0,
            rawItem: item
          }));
        }

        // Fallback to database items if no JSON line items
        return invoice.items.map((item, index) => ({
          id: item.id,
          lineNumber: index + 1,
          productName: item.productName,
          description: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          unitOfMeasure: '',
          productCode: '',
          exemptAmount: 0,
          discount: 0,
          rawItem: null
        }));
      })(),

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