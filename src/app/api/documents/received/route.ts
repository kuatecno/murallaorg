/**
 * OpenFactura Received Documents API Integration
 * POST /api/documents/received - Fetch received documents from OpenFactura
 */

import { NextRequest, NextResponse } from 'next/server';

const OPENFACTURA_API_URL = 'https://dev-api.haulmer.com/v2/dte/document/received';
const OPENFACTURA_API_KEY = '928e15a2d14d4a6292345f04960f4bd3';
const COMPANY_RUT = '78188363'; // Your company RUT without dots and dash

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
    const body = await request.json();

    // Build the request payload for OpenFactura
    const payload: ReceivedDocumentsRequest = {
      Page: body.page || "1",
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
        if (typeof filterValue === 'object') {
          payload[filterKey as keyof ReceivedDocumentsRequest] = filterValue;
        }
      });
    }

    console.log('Sending request to OpenFactura:', JSON.stringify(payload, null, 2));

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

    // Transform response to match our format
    const transformedResponse = {
      success: true,
      pagination: {
        currentPage: data.current_page,
        lastPage: data.last_page,
        total: data.total,
        perPage: data.data.length,
      },
      documents: data.data.map(doc => ({
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
          companyRut: COMPANY_RUT,
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
    companyRut: COMPANY_RUT,
    availableFilters: {
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