/**
 * OpenFactura Received Documents API Integration
 * POST /api/documents/received - Fetch received documents from OpenFactura
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateRUT, getRUTNumber, formatRUTForAPI } from '@/lib/chilean-utils';

const OPENFACTURA_API_URL = 'https://api.haulmer.com/v2/dte/document/received';
const OPENFACTURA_API_KEY = process.env.OPENFACTURA_API_KEY;

interface FilterOperator {
  eq?: string | number;
  lt?: string | number;
  gt?: string | number;
  lte?: string | number;
  gte?: string | number;
  ne?: string | number;
}

interface ReceivedDocumentsRequest {
  Page?: string | number;
  TipoDTE?: FilterOperator;
  FchEmis?: FilterOperator;
  FchRecepOF?: FilterOperator;
  FchRecepSII?: FilterOperator;
  RUTEmisor?: FilterOperator;
  RUTRecep?: FilterOperator; // Receiver RUT filter
}

interface OpenFacturaDocument {
  RUTEmisor: number;
  DV: string;
  RznSoc: string;
  TipoDTE: number;
  Folio: number;
  FchEmis: string;
  FchRecepSII: string;
  FchRecepOF: string;
  MntExe: number;
  MntNeto: number;
  IVA: number;
  MntTotal: number;
  Acuses: Array<{
    codEvento: string;
    fechaEvento: string;
    estado: string;
  }>;
  FmaPago: string;
  TpoTranCompra: number;
  // Add potential receiver fields that might exist in the actual API response
  RUTRecep?: number;
  DVRecep?: string;
  RznSocRecep?: string;
}

interface OpenFacturaResponse {
  current_page: number;
  last_page: number;
  data: OpenFacturaDocument[];
  total: number;
}

/**
 * POST /api/documents/received
 * Fetch received documents from OpenFactura API
 */
export async function POST(request: NextRequest) {
  try {
    if (!OPENFACTURA_API_KEY) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          details: 'OPENFACTURA_API_KEY environment variable is not set',
          success: false
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Get tenant from request or use first active tenant with OpenFactura configured
    const { tenantId } = body;
    let tenant;

    if (tenantId) {
      tenant = await prisma.tenant.findFirst({
        where: { id: tenantId, isActive: true, rut: { not: null } },
        select: { id: true, name: true, rut: true },
      });
    } else {
      // Find first active tenant that has a RUT configured for OpenFactura
      tenant = await prisma.tenant.findFirst({
        where: {
          isActive: true,
          rut: { not: null },
        },
        orderBy: { createdAt: 'asc' }, // Ensure consistent default tenant
        select: { id: true, name: true, rut: true },
      });
    }

    if (!tenant || !tenant.rut) {
      return NextResponse.json(
        {
          error: 'No configured tenant found',
          details: 'No active tenant with RUT found for OpenFactura integration',
          success: false
        },
        { status: 404 }
      );
    }

    // Validate tenant RUT
    if (!validateRUT(tenant.rut)) {
      return NextResponse.json(
        {
          error: 'Invalid tenant RUT',
          details: `Tenant RUT ${tenant.rut} is not a valid Chilean RUT`,
          success: false
        },
        { status: 400 }
      );
    }

    // Get RUT number for filtering (receiver RUT)
    const companyRutNumber = getRUTNumber(tenant.rut);
    const companyRutFormatted = formatRUTForAPI(tenant.rut);

    // Build the request payload for OpenFactura
    const payload: ReceivedDocumentsRequest = {
      Page: body.page || "1",
      // CRITICAL: Filter by receiver RUT to get only documents received by this tenant
      RUTRecep: { eq: companyRutNumber }
    };

    // Add filters if provided
    if (body.tipoDTE) {
      payload.TipoDTE = { eq: body.tipoDTE };
    }

    if (body.fechaEmision) {
      payload.FchEmis = { eq: body.fechaEmision };
    }

    if (body.fechaRecepcionOF) {
      payload.FchRecepOF = { eq: body.fechaRecepcionOF };
    }

    if (body.fechaRecepcionSII) {
      payload.FchRecepSII = { eq: body.fechaRecepcionSII };
    }

    if (body.rutEmisor) {
      payload.RUTEmisor = { eq: body.rutEmisor };
    }

    // Default to last 90 days if no date filter is provided
    const hasDateFilter = payload.FchEmis || payload.FchRecepOF || payload.FchRecepSII;
    if (!hasDateFilter) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const formattedDate = ninetyDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD
      payload.FchEmis = { gte: formattedDate };
    }

    // Advanced filter operators support
    if (body.filters) {
      Object.keys(body.filters).forEach(filterKey => {
        const filterValue = body.filters[filterKey];
        const key = filterKey as keyof ReceivedDocumentsRequest;

        if (typeof filterValue === 'object' && filterValue !== null) {
          // Handle operator objects like { eq: 'value' }
          payload[key] = filterValue;
        } else if (typeof filterValue === 'string' || typeof filterValue === 'number') {
          // Handle simple values like 'value', wrap them in 'eq'
          payload[key] = { eq: filterValue };
        }
      });
    }

    console.log('Sending request to OpenFactura for tenant:', {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantRut: tenant.rut,
      companyRutNumber: companyRutNumber,
      companyRutFormatted: companyRutFormatted,
      payload: JSON.stringify(payload, null, 2)
    });

    // Make request to OpenFactura API
    const response = await fetch(OPENFACTURA_API_URL, {
      method: 'POST',
      headers: {
        'apikey': OPENFACTURA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenFactura API error:', response.status, errorText);

      return NextResponse.json(
        {
          error: 'Failed to fetch received documents',
          details: `OpenFactura API returned ${response.status}: ${errorText}`,
          status: response.status
        },
        { status: response.status }
      );
    }

    const data: OpenFacturaResponse = await response.json();

    console.log(`OpenFactura returned ${data.data.length} documents for RUT ${companyRutFormatted}`);

    // Log first document structure for debugging
    if (data.data.length > 0) {
      console.log('Sample document structure:', JSON.stringify(data.data[0], null, 2));
    }

    // Since we're filtering by RUTRecep in the API request, all returned documents
    // should already be for the correct receiving company
    const filteredDocuments = data.data;

    // Transform response to match our format
    const transformedResponse = {
      success: true,
      pagination: {
        currentPage: data.current_page,
        lastPage: data.last_page,
        total: data.total,
        perPage: data.data.length,
      },
      documents: filteredDocuments.map(doc => ({
        id: `${doc.RUTEmisor}-${doc.TipoDTE}-${doc.Folio}`,
        rutEmisor: `${doc.RUTEmisor}-${doc.DV}`,
        razonSocialEmisor: doc.RznSoc,
        tipoDocumento: doc.TipoDTE,
        tipoDocumentoNombre: getTipoDocumentoNombre(doc.TipoDTE),
        folio: doc.Folio,
        fechaEmision: doc.FchEmis,
        fechaRecepcionSII: doc.FchRecepSII,
        fechaRecepcionOF: doc.FchRecepOF,
        montos: {
          exento: doc.MntExe,
          neto: doc.MntNeto,
          iva: doc.IVA,
          total: doc.MntTotal,
        },
        formaPago: doc.FmaPago,
        formaPagoNombre: getFormaPagoNombre(doc.FmaPago),
        tipoTransaccionCompra: doc.TpoTranCompra,
        tipoTransaccionCompraNombre: getTipoTransaccionCompraNombre(doc.TpoTranCompra),
        acuses: doc.Acuses,
        // Additional metadata
        metadata: {
          companyRutNumber: companyRutNumber,
          companyRutFormatted: companyRutFormatted,
          tenantId: tenant.id,
          tenantName: tenant.name,
          apiSource: 'OpenFactura',
          retrievedAt: new Date().toISOString(),
        }
      })),
      filters: payload,
      summary: {
        totalDocuments: data.total,
        totalAmount: data.data.reduce((sum, doc) => sum + doc.MntTotal, 0),
        documentTypes: getDocumentTypeSummary(data.data),
      }
    };

    return NextResponse.json(transformedResponse);

  } catch (error) {
    console.error('Error processing received documents request:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents/received
 * Get basic info about the endpoint and available filters
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/documents/received',
    method: 'POST',
    description: 'Fetch received documents from OpenFactura API',
    note: 'Use tenantId in request body to specify which tenant to fetch documents for',
    availableFilters: {
      tenantId: 'Tenant ID (optional - uses first active tenant if not provided)',
      page: 'Page number (default: 1)',
      tipoDTE: 'Document type (33=Factura, 39=Boleta, etc.)',
      fechaEmision: 'Emission date (YYYY-mm-dd)',
      fechaRecepcionOF: 'OpenFactura reception date (YYYY-mm-dd)',
      fechaRecepcionSII: 'SII reception date (YYYY-mm-dd)',
      rutEmisor: 'Issuer RUT (without dots or dash)',
    },
    operators: {
      eq: 'Equal to (=)',
      lt: 'Less than (<)',
      gt: 'Greater than (>)',
      lte: 'Less than or equal (<=)',
      gte: 'Greater than or equal (>=)',
      ne: 'Not equal (!=)',
    },
    exampleRequest: {
      page: 1,
      tipoDTE: 33,
      fechaEmision: '2024-01-15',
      rutEmisor: '76264675'
    },
    exampleAdvancedRequest: {
      page: 1,
      filters: {
        TipoDTE: { eq: 33 },
        FchEmis: { gte: '2024-01-01', lte: '2024-01-31' },
        MntTotal: { gt: 100000 }
      }
    }
  });
}

// Helper functions
function getTipoDocumentoNombre(tipo: number): string {
  const tipos: Record<number, string> = {
    33: 'Factura Electrónica',
    34: 'Factura No Afecta o Exenta Electrónica',
    39: 'Boleta Electrónica',
    41: 'Boleta No Afecta o Exenta Electrónica',
    43: 'Liquidación Factura Electrónica',
    46: 'Factura de Compra Electrónica',
    52: 'Guía de Despacho Electrónica',
    56: 'Nota de Débito Electrónica',
    61: 'Nota de Crédito Electrónica',
  };
  return tipos[tipo] || `Tipo ${tipo}`;
}

function getFormaPagoNombre(forma: string): string {
  const formas: Record<string, string> = {
    '1': 'Contado',
    '2': 'Crédito',
    '3': 'Sin costo (entrega gratuita)',
  };
  return formas[forma] || `Forma ${forma}`;
}

function getTipoTransaccionCompraNombre(tipo: number): string {
  const tipos: Record<number, string> = {
    1: 'Compras del giro',
    2: 'Compras en Supermercados o similares',
    3: 'Adquisición Bien Raíz',
    4: 'Compra Activo Fijo',
    5: 'Compra con IVA Uso Común',
    6: 'Compra sin derecho a crédito',
    7: 'Compra que no corresponde incluir',
  };
  return tipos[tipo] || `Tipo ${tipo}`;
}

function getDocumentTypeSummary(documents: OpenFacturaDocument[]) {
  const summary: Record<number, { count: number; total: number }> = {};

  documents.forEach(doc => {
    if (!summary[doc.TipoDTE]) {
      summary[doc.TipoDTE] = { count: 0, total: 0 };
    }
    summary[doc.TipoDTE].count++;
    summary[doc.TipoDTE].total += doc.MntTotal;
  });

  return Object.entries(summary).map(([tipo, data]) => ({
    tipoDocumento: parseInt(tipo),
    tipoDocumentoNombre: getTipoDocumentoNombre(parseInt(tipo)),
    cantidad: data.count,
    montoTotal: data.total,
  }));
}