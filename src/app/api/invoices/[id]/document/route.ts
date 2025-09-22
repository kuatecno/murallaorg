/**
 * OpenFactura Document Viewer API
 * GET /api/invoices/[id]/document?format=pdf|json|xml|status|cedible
 * Fetches real OpenFactura document content
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const OPENFACTURA_API_BASE = 'https://api.haulmer.com/v2/dte/document';
const OPENFACTURA_API_KEY = process.env.OPENFACTURA_API_KEY;

/**
 * GET /api/invoices/[id]/document
 * Fetch real OpenFactura document content
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';

    // Validate format
    const validFormats = ['pdf', 'json', 'xml', 'status', 'cedible'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    if (!OPENFACTURA_API_KEY) {
      return NextResponse.json(
        { error: 'OpenFactura API key not configured' },
        { status: 500 }
      );
    }

    // Fetch invoice data from database
    const invoice = await prisma.taxDocument.findUnique({
      where: { id },
      select: {
        id: true,
        folio: true,
        documentCode: true,
        emitterRUT: true,
        emitterName: true,
        type: true,
        status: true
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Extract RUT without DV (OpenFactura expects just the number + DV)
    const rut = invoice.emitterRUT; // Should already be in format "12345678-9"
    const documentType = invoice.documentCode;
    const folio = invoice.folio;

    // Build OpenFactura API URL
    const openFacturaUrl = `${OPENFACTURA_API_BASE}/${rut}/${documentType}/${folio}/${format}`;

    console.log(`Fetching OpenFactura document: ${openFacturaUrl}`);

    // Fetch document from OpenFactura
    const response = await fetch(openFacturaUrl, {
      method: 'GET',
      headers: {
        'apikey': OPENFACTURA_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`OpenFactura API error: ${response.status} ${response.statusText}`);

      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Document not found in OpenFactura' },
          { status: 404 }
        );
      }

      const errorText = await response.text();
      return NextResponse.json(
        {
          error: 'Failed to fetch document from OpenFactura',
          details: `${response.status}: ${errorText}`
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Handle different response formats
    if (format === 'pdf' && data.pdf) {
      // PDF is base64 encoded, decode and return as PDF
      const pdfBuffer = Buffer.from(data.pdf, 'base64');

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="documento-${folio}.pdf"`,
        },
      });
    }

    if (format === 'xml' && data.xml) {
      // XML is base64 encoded, decode and return as XML
      const xmlContent = Buffer.from(data.xml, 'base64').toString('utf-8');

      return new NextResponse(xmlContent, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `inline; filename="documento-${folio}.xml"`,
        },
      });
    }

    if (format === 'cedible' && data.cedible) {
      // Cedible PDF is base64 encoded
      const pdfBuffer = Buffer.from(data.cedible, 'base64');

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="documento-cedible-${folio}.pdf"`,
        },
      });
    }

    // For JSON and status, return as JSON
    return NextResponse.json({
      success: true,
      documentInfo: {
        id: invoice.id,
        folio: invoice.folio,
        emitterRUT: invoice.emitterRUT,
        emitterName: invoice.emitterName,
        type: invoice.type,
        documentCode: invoice.documentCode
      },
      format,
      data
    });

  } catch (error) {
    console.error('Error fetching OpenFactura document:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}