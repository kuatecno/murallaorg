/**
 * OpenFactura Sync API
 * POST /api/sync/openfactura - Manual sync trigger
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TaxDocumentType, TaxDocumentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { validateRUT, getRUTNumber, formatRUTForAPI } from '@/lib/chilean-utils';

const OPENFACTURA_API_URL = 'https://api.haulmer.com/v2/dte/document/received';
const OPENFACTURA_DETAIL_URL = 'https://api.haulmer.com/v2/dte/document';

// Multi-tenant API key support
const OPENFACTURA_API_KEY_MURALLA = process.env.OPENFACTURA_API_KEY_MURALLA;
const OPENFACTURA_API_KEY_MURALLITA = process.env.OPENFACTURA_API_KEY_MURALLITA;

console.log('🔑 ENV VARIABLES:');
console.log(`  OPENFACTURA_API_KEY_MURALLA: ${OPENFACTURA_API_KEY_MURALLA ? `${OPENFACTURA_API_KEY_MURALLA.substring(0, 10)}...` : 'UNDEFINED'}`);
console.log(`  OPENFACTURA_API_KEY_MURALLITA: ${OPENFACTURA_API_KEY_MURALLITA ? `${OPENFACTURA_API_KEY_MURALLITA.substring(0, 10)}...` : 'UNDEFINED'}`);

// Map tenant RUT numbers to their API keys
const API_KEY_BY_RUT: Record<number, string> = {
  78188363: OPENFACTURA_API_KEY_MURALLA || '',     // Muralla SPA
  78225753: OPENFACTURA_API_KEY_MURALLITA || '',   // Murallita MEF EIRL
};

interface OpenFacturaDocument {
  // Basic document info
  RUTEmisor: number;
  DV: string;
  RznSoc: string;
  TipoDTE: number;
  Folio: number;

  // Dates
  FchEmis: string; // Issue date
  FchRecepSII?: string; // SII reception date
  FchRecepOF?: string; // OpenFactura reception date

  // Amounts
  MntExe?: number; // Exempt amount
  MntNeto?: number; // Net amount
  IVA?: number; // Tax amount
  MntTotal: number; // Total amount

  // Payment and transaction info
  FmaPago?: string; // Payment method
  TpoTranCompra?: number; // Purchase transaction type

  // Document acknowledgments
  Acuses?: Array<{
    codEvento: string;
    fechaEvento: string;
    estado: string;
    descripcion?: string;
  }>;

  // Additional possible fields (some documents may have these)
  GlosaDte?: string; // Document description
  Observaciones?: string; // Observations
  MontoExe?: number; // Alternative exempt amount field
  MontoNF?: number; // Non-taxable amount
  ValorDR?: number; // Discount/surcharge value
  TipoDespacho?: number; // Dispatch type
  IndTraslado?: number; // Transfer indicator

  // Receiver fields that might exist in the actual API response
  RUTRecep?: number;
  DVRecep?: string;
  RznSocRecep?: string;

  [key: string]: any; // Allow additional unknown fields
}

interface OpenFacturaResponse {
  current_page: number;
  last_page: number;
  data: OpenFacturaDocument[];
  total: number;
}

function mapDocumentType(tipoDTE: number): TaxDocumentType {
  switch (tipoDTE) {
    case 33:
      return 'FACTURA';
    case 34:
      return 'FACTURA'; // Factura Exenta maps to FACTURA
    case 39:
      return 'BOLETA';
    case 56:
      return 'NOTA_DEBITO';
    case 61:
      return 'NOTA_CREDITO';
    default:
      return 'FACTURA';
  }
}

function createEnhancedDocumentData(doc: OpenFacturaDocument) {
  return {
    // Original document data
    ...doc,

    // Enhanced metadata extraction
    metadata: {
      // Document classification
      documentTypeName: getDocumentTypeName(doc.TipoDTE),
      isExempt: doc.TipoDTE === 34,
      hasExemptAmount: (doc.MntExe || doc.MontoExe || 0) > 0,

      // Amounts breakdown
      amounts: {
        total: doc.MntTotal,
        net: doc.MntNeto || 0,
        tax: doc.IVA || 0,
        exempt: doc.MntExe || doc.MontoExe || 0,
        nonTaxable: doc.MontoNF || 0,
        discountSurcharge: doc.ValorDR || 0
      },

      // Dates processing
      dates: {
        issued: doc.FchEmis,
        receivedSII: doc.FchRecepSII,
        receivedOF: doc.FchRecepOF,
        issuedTimestamp: new Date(doc.FchEmis).getTime(),
        receivedSIITimestamp: doc.FchRecepSII ? new Date(doc.FchRecepSII).getTime() : null,
        receivedOFTimestamp: doc.FchRecepOF ? new Date(doc.FchRecepOF).getTime() : null
      },

      // Business logic
      business: {
        paymentMethod: doc.FmaPago,
        purchaseTransactionType: doc.TpoTranCompra,
        dispatchType: doc.TipoDespacho,
        transferIndicator: doc.IndTraslado,
        hasObservations: !!(doc.Observaciones || doc.GlosaDte),
        observationText: doc.Observaciones || doc.GlosaDte || null
      },

      // Acknowledgments processing
      acknowledgments: {
        count: doc.Acuses?.length || 0,
        events: doc.Acuses?.map(acuse => ({
          code: acuse.codEvento,
          date: acuse.fechaEvento,
          status: acuse.estado,
          description: acuse.descripcion,
          timestamp: new Date(acuse.fechaEvento).getTime()
        })) || [],
        lastEvent: doc.Acuses?.length ? doc.Acuses[doc.Acuses.length - 1] : null
      },

      // Validation flags
      validation: {
        hasRequiredFields: !!(doc.RUTEmisor && doc.Folio && doc.TipoDTE && doc.MntTotal),
        hasSIIReception: !!doc.FchRecepSII,
        hasPaymentInfo: !!doc.FmaPago,
        isComplete: !!(doc.RUTEmisor && doc.Folio && doc.TipoDTE && doc.MntTotal && doc.FchRecepSII)
      }
    }
  };
}

function getDocumentTypeName(tipoDTE: number): string {
  switch (tipoDTE) {
    case 33: return 'Factura Electrónica';
    case 34: return 'Factura No Afecta o Exenta Electrónica';
    case 39: return 'Boleta Electrónica';
    case 41: return 'Boleta No Afecta o Exenta Electrónica';
    case 46: return 'Factura de Compra Electrónica';
    case 52: return 'Guía de Despacho Electrónica';
    case 56: return 'Nota de Débito Electrónica';
    case 61: return 'Nota de Crédito Electrónica';
    default: return `Documento Tipo ${tipoDTE}`;
  }
}

interface FetchOptions {
  page?: number;
  fromDate?: string; // YYYY-MM-DD format
  toDate?: string; // YYYY-MM-DD format
  maxDays?: number; // Maximum days to query (default 90)
  receiverRut?: number; // Receiver RUT for filtering
  apiKey?: string; // API key to use for this request
}

async function fetchOpenFacturaPage(options: FetchOptions = {}): Promise<OpenFacturaResponse> {
  const apiKey = options.apiKey;
  if (!apiKey) {
    throw new Error('API key not provided');
  }

  const {
    page = 1,
    fromDate,
    toDate,
    maxDays = 90
  } = options;

  // Calculate date range (using Chilean timezone)
  let startDate: string;
  let endDate: string;

  if (fromDate && toDate) {
    startDate = fromDate;
    endDate = toDate;
  } else if (fromDate) {
    startDate = fromDate;
    // If only fromDate provided, limit to maxDays from that date
    const from = new Date(fromDate);
    const to = new Date(from.getTime() + maxDays * 24 * 60 * 60 * 1000);
    endDate = to.toISOString().split('T')[0];
  } else {
    // Default: last maxDays (using Chilean timezone + 1 day buffer)
    const chileanDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
    chileanDate.setDate(chileanDate.getDate() + 1); // Tomorrow in Chile
    endDate = chileanDate.toISOString().split('T')[0];
    startDate = new Date(chileanDate.getTime() - maxDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  const payload: any = {
    Page: page.toString(),
    FchEmis: {
      gte: startDate,
      lte: endDate
    }
  };

  // NOTE: RUTRecep filter does NOT work - OpenFactura API ignores it
  // We fetch ALL documents and filter on our side using detail endpoint data
  // if (options.receiverRut) {
  //   payload.RUTRecep = { eq: options.receiverRut };
  // }

  console.log(`Fetching OpenFactura page ${page} (all companies):`, JSON.stringify(payload, null, 2));

  const response = await fetch(OPENFACTURA_API_URL, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ OpenFactura API error ${response.status}: ${errorText}`);
    throw new Error(`OpenFactura API error ${response.status}: ${errorText}`);
  }

  const responseData = await response.json();
  console.log(`✅ OpenFactura API response: page ${responseData.current_page}/${responseData.last_page}, ${responseData.data?.length || 0} documents`);

  return responseData;
}

async function fetchDocumentDetails(rut: string, type: number, folio: number, apiKey: string): Promise<any> {
  if (!apiKey) {
    throw new Error('API key not provided');
  }

  const detailUrl = `${OPENFACTURA_DETAIL_URL}/${rut}/${type}/${folio}/json`;

  console.log(`Fetching document details: ${detailUrl}`);

  try {
    const response = await fetch(detailUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch details for ${rut}/${type}/${folio}: ${response.status}`);
      return null; // Return null if details can't be fetched, don't fail the sync
    }

    const details = await response.json();
    return details;
  } catch (error) {
    console.warn(`Error fetching document details for ${rut}/${type}/${folio}:`, error);
    return null; // Don't fail the sync if details can't be fetched
  }
}

function extractLineItemsFromDetails(details: any): any[] {
  if (!details || !details.json) {
    return [];
  }

  try {
    const document = details.json;

    // Line items are typically in Detalle array
    if (document.Detalle && Array.isArray(document.Detalle)) {
      return document.Detalle.map((item: any, index: number) => ({
        lineNumber: item.NroLinDet || (index + 1),
        productName: item.DscItem || item.NmbItem || `Item ${index + 1}`,
        description: item.DscItem || item.NmbItem || '',
        quantity: item.QtyItem || 1,
        unitPrice: item.PrcItem || 0,
        totalPrice: item.MontoItem || (item.PrcItem * item.QtyItem) || 0,
        unitOfMeasure: item.UnmdItem || '',
        productCode: item.CdgItem?.VlrCodigo || '',
        exemptAmount: item.MontoExe || 0,
        discount: item.DescuentoMonto || 0,
        rawItem: item // Store complete item data
      }));
    }

    // Alternative structure - some documents might have items in different places
    if (document.Encabezado?.Detalle && Array.isArray(document.Encabezado.Detalle)) {
      return document.Encabezado.Detalle.map((item: any, index: number) => ({
        lineNumber: index + 1,
        productName: item.NmbItem || item.DscItem || `Item ${index + 1}`,
        description: item.DscItem || item.NmbItem || '',
        quantity: item.QtyItem || 1,
        unitPrice: item.PrcItem || 0,
        totalPrice: item.MontoItem || 0,
        rawItem: item
      }));
    }

    return [];
  } catch (error) {
    console.warn('Error extracting line items:', error);
    return [];
  }
}

function enhanceDocumentWithDetails(doc: OpenFacturaDocument, details: any): any {
  const enhanced: any = createEnhancedDocumentData(doc);

  if (!details) {
    return enhanced;
  }

  try {
    // Add detailed information from the JSON response
    enhanced.detailedData = {
      // Document header information
      header: details.json?.Encabezado || null,

      // Complete JSON structure
      fullDocument: details.json || null,

      // Line items extracted
      lineItems: extractLineItemsFromDetails(details),

      // Additional document info
      documentInfo: {
        folio: details.folio,
        receptionDateSII: details.FchRecepSII,
        receptionDateOF: details.FchRecepOF,
        status: details.status || null
      },

      // Emitter details
      emitter: details.json?.Encabezado?.Emisor ? {
        rut: details.json.Encabezado.Emisor.RUTEmisor,
        businessName: details.json.Encabezado.Emisor.RznSoc,
        businessLine: details.json.Encabezado.Emisor.GiroEmis,
        email: details.json.Encabezado.Emisor.CorreoEmisor,
        address: details.json.Encabezado.Emisor.DirOrigen,
        commune: details.json.Encabezado.Emisor.CmnaOrigen,
        economicActivity: details.json.Encabezado.Emisor.Acteco
      } : null,

      // Receiver details
      receiver: details.json?.Encabezado?.Receptor ? {
        rut: details.json.Encabezado.Receptor.RUTRecep,
        businessName: details.json.Encabezado.Receptor.RznSocRecep,
        businessLine: details.json.Encabezado.Receptor.GiroRecep,
        contact: details.json.Encabezado.Receptor.Contacto,
        address: details.json.Encabezado.Receptor.DirRecep,
        commune: details.json.Encabezado.Receptor.CmnaRecep
      } : null,

      // Enhanced totals
      totals: details.json?.Encabezado?.Totales ? {
        netAmount: details.json.Encabezado.Totales.MntNeto || 0,
        exemptAmount: details.json.Encabezado.Totales.MntExe || 0,
        taxAmount: details.json.Encabezado.Totales.IVA || 0,
        totalAmount: details.json.Encabezado.Totales.MntTotal || 0,
        additionalTaxes: details.json.Encabezado.Totales.ImptoReten || []
      } : null
    };

    return enhanced;
  } catch (error) {
    console.warn('Error enhancing document with details:', error);
    return enhanced;
  }
}

async function chunkDateRange(fromDate: string, toDate: string, maxDaysPerChunk: number = 90): Promise<{ from: string, to: string }[]> {
  const chunks: { from: string, to: string }[] = [];
  const start = new Date(fromDate);
  const end = new Date(toDate);

  let current = new Date(start);

  while (current < end) {
    const chunkEnd = new Date(current.getTime() + maxDaysPerChunk * 24 * 60 * 60 * 1000);
    const actualEnd = chunkEnd > end ? end : chunkEnd;

    chunks.push({
      from: current.toISOString().split('T')[0],
      to: actualEnd.toISOString().split('T')[0]
    });

    current = new Date(actualEnd.getTime() + 24 * 60 * 60 * 1000); // Start next chunk from next day
  }

  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    // Parse query parameters and request body
    const url = new URL(request.url);
    const requestBody = request.body ? await request.json().catch(() => ({})) : {};

    const syncOptions = {
      fromDate: url.searchParams.get('fromDate') || requestBody.fromDate,
      toDate: url.searchParams.get('toDate') || requestBody.toDate,
      maxDays: parseInt(url.searchParams.get('maxDays') || requestBody.maxDays || '90'),
      chunkSize: parseInt(url.searchParams.get('chunkSize') || requestBody.chunkSize || '90'), // Days per API call
      months: parseInt(url.searchParams.get('months') || requestBody.months || '0'), // Alternative to fromDate
      tenantId: url.searchParams.get('tenantId') || requestBody.tenantId // Optional: sync specific tenant only
    };

    console.log('Starting OpenFactura sync with options:', syncOptions);

    // Helper function to get date in Chilean timezone
    const getChileanDate = (offset: number = 0): string => {
      const date = new Date();
      // Convert to Chilean timezone (UTC-3 or UTC-4 depending on DST)
      const chileanDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
      chileanDate.setDate(chileanDate.getDate() + offset);
      return chileanDate.toISOString().split('T')[0];
    };

    // Calculate date range based on options
    let finalFromDate: string;
    let finalToDate: string;

    if (syncOptions.months > 0) {
      // Sync last N months (using Chilean timezone)
      finalToDate = getChileanDate(1); // Tomorrow in Chile to ensure we capture all of today
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
      now.setMonth(now.getMonth() - syncOptions.months);
      finalFromDate = now.toISOString().split('T')[0];
    } else if (syncOptions.fromDate && syncOptions.toDate) {
      finalFromDate = syncOptions.fromDate;
      finalToDate = syncOptions.toDate;
    } else if (syncOptions.fromDate) {
      finalFromDate = syncOptions.fromDate;
      finalToDate = getChileanDate(1); // Tomorrow in Chile
    } else {
      // Default: last 90 days (using Chilean timezone)
      // Add 1 day buffer to ensure we capture today's invoices in Chile
      finalToDate = getChileanDate(1); // Tomorrow in Chile
      const defaultDays = syncOptions.maxDays;
      const chileanNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
      finalFromDate = new Date(chileanNow.getTime() - defaultDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    // Get all active tenants with RUT configured, or just one if specified
    let tenantsToSync;

    if (syncOptions.tenantId) {
      // Sync specific tenant only
      const tenant = await prisma.tenant.findUnique({
        where: { id: syncOptions.tenantId, isActive: true },
        select: { id: true, name: true, rut: true }
      });

      if (!tenant || !tenant.rut) {
        return NextResponse.json(
          {
            error: 'Tenant not found',
            details: `No active tenant found with ID ${syncOptions.tenantId} and configured RUT`
          },
          { status: 404 }
        );
      }

      tenantsToSync = [tenant];
    } else {
      // Sync all active tenants with RUT configured
      tenantsToSync = await prisma.tenant.findMany({
        where: {
          isActive: true,
          rut: { not: null }
        },
        select: { id: true, name: true, rut: true },
        orderBy: { name: 'asc' }
      });
    }

    if (tenantsToSync.length === 0) {
      return NextResponse.json(
        {
          error: 'No configured tenants found',
          details: 'No active tenants with RUT found for OpenFactura integration'
        },
        { status: 404 }
      );
    }

    console.log(`📋 Found ${tenantsToSync.length} tenant(s) to sync`);
    console.log(`📌 Tenants:`, tenantsToSync.map(t => `${t.name} (${t.rut})`).join(', '));

    // Get API keys for each tenant
    console.log(`\n🔑 API Key Configuration:`);
    console.log(`  OPENFACTURA_API_KEY_MURALLA: ${OPENFACTURA_API_KEY_MURALLA ? 'SET' : 'NOT SET'}`);
    console.log(`  OPENFACTURA_API_KEY_MURALLITA: ${OPENFACTURA_API_KEY_MURALLITA ? 'SET' : 'NOT SET'}`);
    console.log(`  API_KEY_BY_RUT mapping:`, API_KEY_BY_RUT);

    for (const tenant of tenantsToSync) {
      const rutNumber = getRUTNumber(tenant.rut!);
      const apiKey = API_KEY_BY_RUT[rutNumber];
      if (!apiKey) {
        console.error(`  ❌ No API key for ${tenant.name} (RUT: ${rutNumber})`);
      } else {
        console.log(`  ✅ ${tenant.name} (RUT: ${rutNumber}) → API key configured`);
      }
    }

    // Overall sync statistics
    let overallStats = {
      totalTenants: tenantsToSync.length,
      successfulTenants: 0,
      failedTenants: 0,
      totalDocuments: 0,
      newDocuments: 0,
      updatedDocuments: 0,
      skippedDocuments: 0,
      errors: 0,
      startTime: new Date(),
      endTime: null as Date | null,
      dateRange: {
        from: finalFromDate,
        to: finalToDate,
        totalDays: Math.ceil((new Date(finalToDate).getTime() - new Date(finalFromDate).getTime()) / (24 * 60 * 60 * 1000))
      },
      tenantResults: [] as any[]
    };

    // Calculate chunking strategy
    const chunks = await chunkDateRange(finalFromDate, finalToDate, syncOptions.chunkSize);
    console.log(`📦 Will process ${chunks.length} date chunk(s) per tenant\n`);

    // Process each tenant with their own API key
    for (let tenantIndex = 0; tenantIndex < tenantsToSync.length; tenantIndex++) {
      const tenant = tenantsToSync[tenantIndex];
      const rutNumber = getRUTNumber(tenant.rut!);
      const apiKey = API_KEY_BY_RUT[rutNumber];

      if (!apiKey) {
        console.error(`\n❌ Skipping ${tenant.name} - No API key configured`);
        overallStats.failedTenants++;
        continue;
      }

      console.log(`\n${'='.repeat(80)}`);
      console.log(`🏢 Syncing tenant ${tenantIndex + 1}/${tenantsToSync.length}: ${tenant.name} (${tenant.rut})`);
      console.log(`${'='.repeat(80)}\n`);

      let tenantStats = {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantRUT: tenant.rut,
        totalDocuments: 0,
        newDocuments: 0,
        updatedDocuments: 0,
        skippedDocuments: 0,
        errors: 0,
        startTime: new Date(),
        endTime: null as Date | null,
        pages: 0,
        chunks: chunks.length,
        success: true
      };

      // Process each date chunk for this tenant
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        console.log(`  📦 Processing chunk ${chunkIndex + 1}/${chunks.length}: ${chunk.from} to ${chunk.to}`);

        let currentPage = 1;
        let hasMorePages = true;

        while (hasMorePages) {
          try {
            const pageData = await fetchOpenFacturaPage({
              page: currentPage,
              fromDate: chunk.from,
              toDate: chunk.to,
              apiKey: apiKey
            });
            tenantStats.pages++;

            console.log(`    📄 Page ${currentPage}/${pageData.last_page}: ${pageData.data.length} documents for ${tenant.name}`);

            // NOTE: With per-tenant API keys, each API returns only that tenant's documents
            const allDocuments = pageData.data;
            tenantStats.totalDocuments += allDocuments.length;
            overallStats.totalDocuments += allDocuments.length;

            console.log(`    ⚙️  Processing ${allDocuments.length} documents for ${tenant.name}`);

            // Process each document
            // NOTE: Each API key returns ALL documents for that company
            // We assign them directly to the tenant without any receiverRUT filtering
            for (const doc of allDocuments) {
              try {
                // Create unique identifier
                const uniqueId = `${doc.RUTEmisor}-${doc.TipoDTE}-${doc.Folio}`;

                // Check if document already exists (use unique constraint fields)
                const existingDoc = await prisma.taxDocument.findFirst({
                  where: {
                    tenantId: tenant.id,
                    folio: doc.Folio.toString(),
                    emitterRUT: `${doc.RUTEmisor}-${doc.DV}`
                  }
                });

                const documentData = {
                  type: mapDocumentType(doc.TipoDTE),
                  folio: doc.Folio.toString(),
                  documentCode: doc.TipoDTE,
                  emitterRUT: `${doc.RUTEmisor}-${doc.DV}`,
                  emitterName: doc.RznSoc,
                  receiverRUT: null,  // Will be populated if/when we fetch details
                  receiverName: null,
                  netAmount: new Decimal(doc.MntNeto || 0),
                  taxAmount: new Decimal(doc.IVA || 0),
                  totalAmount: new Decimal(doc.MntTotal || 0),
                  currency: 'CLP',
                  issuedAt: new Date(doc.FchEmis),
                  status: 'ISSUED' as TaxDocumentStatus,
                  rawResponse: doc as any,
                  tenantId: tenant.id
                };

                // No line items for now (only available from detail endpoint)
              const lineItems: any[] = [];

              if (existingDoc) {
                // Update existing document and replace line items
                await prisma.$transaction(async (tx) => {
                  // Update document
                  await tx.taxDocument.update({
                    where: { id: existingDoc.id },
                    data: {
                      ...documentData,
                      updatedAt: new Date()
                    }
                  });

                  // Delete existing line items
                  await tx.taxDocumentItem.deleteMany({
                    where: { taxDocumentId: existingDoc.id }
                  });

                  // Create new line items
                  if (lineItems.length > 0) {
                    await tx.taxDocumentItem.createMany({
                      data: lineItems.map((item: any) => ({
                        taxDocumentId: existingDoc.id,
                        productName: item.productName || 'Unknown Product',
                        quantity: item.quantity || 1,
                        unitPrice: new Decimal(item.unitPrice || 0),
                        totalPrice: new Decimal(item.totalPrice || 0)
                      }))
                    });
                  }
                });
                tenantStats.updatedDocuments++;
                overallStats.updatedDocuments++;
              } else {
                // Create new document with line items
                try {
                  const newDocument = await prisma.taxDocument.create({
                    data: {
                      ...documentData,
                      items: lineItems.length > 0 ? {
                        create: lineItems.map((item: any) => ({
                          productName: item.productName || 'Unknown Product',
                          quantity: item.quantity || 1,
                          unitPrice: new Decimal(item.unitPrice || 0),
                          totalPrice: new Decimal(item.totalPrice || 0)
                        }))
                      } : undefined
                    }
                  });
                  tenantStats.newDocuments++;
                  overallStats.newDocuments++;
                } catch (createError: any) {
                  // Check if it's a unique constraint violation
                  if (createError.code === 'P2002') {
                    console.log(`        ℹ️  Document ${uniqueId} already exists (unique constraint), skipping...`);
                    tenantStats.skippedDocuments++;
                  } else {
                    throw createError;
                  }
                }
              }

            } catch (docError) {
              console.error(`        ❌ Error processing document ${doc.Folio}:`, docError);
              overallStats.errors++;
            }
          }

          // Check if there are more pages
          hasMorePages = currentPage < pageData.last_page;
          currentPage++;

          // Add small delay between pages to be respectful to the API
          if (hasMorePages) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

        } catch (pageError) {
          console.error(`      ❌ Error fetching page ${currentPage}:`, pageError);
          overallStats.errors++;
          hasMorePages = false;
        }
      }

      // Add delay between chunks to be respectful to the API
      if (chunkIndex < chunks.length - 1) {
        console.log(`    ✓ Chunk ${chunkIndex + 1} completed. Waiting before next chunk...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Finalize tenant stats
    tenantStats.endTime = new Date();

    if (tenantStats.newDocuments > 0 || tenantStats.updatedDocuments > 0) {
      overallStats.successfulTenants++;
      console.log(`\n✅ ${tenant.name}: ${tenantStats.newDocuments} new, ${tenantStats.updatedDocuments} updated`);
    } else if (tenantStats.errors > 0) {
      overallStats.failedTenants++;
      tenantStats.success = false;
    }

    overallStats.tenantResults.push(tenantStats);
  }


    overallStats.endTime = new Date();

    const duration = Math.round((overallStats.endTime.getTime() - overallStats.startTime.getTime()) / 1000);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎉 SYNC COMPLETED IN ${duration}s`);
    console.log(`${'='.repeat(80)}`);
    console.log(`📊 Overall Results:`);
    console.log(`   Tenants: ${overallStats.successfulTenants}/${overallStats.totalTenants} successful`);
    console.log(`   Documents: ${overallStats.totalDocuments} processed`);
    console.log(`   ✨ New: ${overallStats.newDocuments}`);
    console.log(`   🔄 Updated: ${overallStats.updatedDocuments}`);
    console.log(`   ⏭️  Skipped: ${overallStats.skippedDocuments}`);
    console.log(`   ❌ Errors: ${overallStats.errors}`);
    console.log(`${'='.repeat(80)}\n`);

    return NextResponse.json({
      success: overallStats.failedTenants === 0,
      message: overallStats.failedTenants === 0
        ? 'OpenFactura sync completed successfully for all tenants'
        : `OpenFactura sync completed with ${overallStats.failedTenants} tenant(s) having errors`,
      stats: overallStats
    });

  } catch (error) {
    console.error('OpenFactura sync failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Sync failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}