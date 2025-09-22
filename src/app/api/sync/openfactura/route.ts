/**
 * OpenFactura Sync API
 * POST /api/sync/openfactura - Manual sync trigger
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TaxDocumentType, TaxDocumentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const OPENFACTURA_API_URL = 'https://api.haulmer.com/v2/dte/document/received';
const OPENFACTURA_API_KEY = process.env.OPENFACTURA_API_KEY;
const COMPANY_RUT = '78188363';

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
}

async function fetchOpenFacturaPage(options: FetchOptions = {}): Promise<OpenFacturaResponse> {
  if (!OPENFACTURA_API_KEY) {
    throw new Error('OPENFACTURA_API_KEY not configured');
  }

  const {
    page = 1,
    fromDate,
    toDate,
    maxDays = 90
  } = options;

  // Calculate date range
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
    // Default: last maxDays
    endDate = new Date().toISOString().split('T')[0];
    startDate = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  const payload = {
    Page: page.toString(),
    FchEmis: {
      gte: startDate,
      lte: endDate
    }
  };

  console.log(`Fetching OpenFactura page ${page}:`, JSON.stringify(payload, null, 2));

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
    throw new Error(`OpenFactura API error ${response.status}: ${errorText}`);
  }

  return response.json();
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
      months: parseInt(url.searchParams.get('months') || requestBody.months || '0') // Alternative to fromDate
    };

    console.log('Starting OpenFactura sync with options:', syncOptions);

    // Calculate date range based on options
    let finalFromDate: string;
    let finalToDate: string;

    if (syncOptions.months > 0) {
      // Sync last N months
      const now = new Date();
      finalToDate = now.toISOString().split('T')[0];
      const monthsAgo = new Date(now);
      monthsAgo.setMonth(monthsAgo.getMonth() - syncOptions.months);
      finalFromDate = monthsAgo.toISOString().split('T')[0];
    } else if (syncOptions.fromDate && syncOptions.toDate) {
      finalFromDate = syncOptions.fromDate;
      finalToDate = syncOptions.toDate;
    } else if (syncOptions.fromDate) {
      finalFromDate = syncOptions.fromDate;
      finalToDate = new Date().toISOString().split('T')[0];
    } else {
      // Default: last 90 days
      const now = new Date();
      finalToDate = now.toISOString().split('T')[0];
      const defaultDays = syncOptions.maxDays;
      finalFromDate = new Date(now.getTime() - defaultDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    // Get tenant (for now use first active tenant)
    const tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, rut: true }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'No active tenant found' },
        { status: 404 }
      );
    }

    // Calculate total date range and chunking strategy
    const totalDays = Math.ceil((new Date(finalToDate).getTime() - new Date(finalFromDate).getTime()) / (24 * 60 * 60 * 1000));
    const chunks = await chunkDateRange(finalFromDate, finalToDate, syncOptions.chunkSize);

    console.log(`Syncing ${totalDays} days from ${finalFromDate} to ${finalToDate} in ${chunks.length} chunks`);

    let syncStats = {
      totalDocuments: 0,
      newDocuments: 0,
      updatedDocuments: 0,
      skippedDocuments: 0,
      errors: 0,
      startTime: new Date(),
      endTime: null as Date | null,
      pages: 0,
      chunks: chunks.length,
      dateRange: {
        from: finalFromDate,
        to: finalToDate,
        totalDays: totalDays
      }
    };

    // Process each date chunk
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length}: ${chunk.from} to ${chunk.to}`);

      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        try {
          const pageData = await fetchOpenFacturaPage({
            page: currentPage,
            fromDate: chunk.from,
            toDate: chunk.to
          });
        syncStats.pages++;
        syncStats.totalDocuments += pageData.data.length;

        console.log(`Processing page ${currentPage}/${pageData.last_page} with ${pageData.data.length} documents`);

        // Process each document in the page
        for (const doc of pageData.data) {
          try {
            // Create unique identifier
            const uniqueId = `${doc.RUTEmisor}-${doc.TipoDTE}-${doc.Folio}`;

            // Check if document already exists
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
              receiverRUT: tenant.rut || '',
              receiverName: tenant.name,
              netAmount: new Decimal(doc.MntNeto || 0),
              taxAmount: new Decimal(doc.IVA || 0),
              totalAmount: new Decimal(doc.MntTotal || 0),
              currency: 'CLP',
              issuedAt: new Date(doc.FchEmis),
              status: 'ISSUED' as TaxDocumentStatus, // All received documents are issued
              rawResponse: createEnhancedDocumentData(doc) as any,
              tenantId: tenant.id
            };

            if (existingDoc) {
              // Update existing document
              await prisma.taxDocument.update({
                where: { id: existingDoc.id },
                data: {
                  ...documentData,
                  updatedAt: new Date()
                }
              });
              syncStats.updatedDocuments++;
            } else {
              // Create new document
              await prisma.taxDocument.create({
                data: documentData
              });
              syncStats.newDocuments++;
            }

          } catch (docError) {
            console.error(`Error processing document ${doc.Folio}:`, docError);
            syncStats.errors++;
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
          console.error(`Error fetching page ${currentPage}:`, pageError);
          syncStats.errors++;
          hasMorePages = false;
        }
      }

      // Add delay between chunks to be respectful to the API
      if (chunkIndex < chunks.length - 1) {
        console.log(`Chunk ${chunkIndex + 1} completed. Waiting before next chunk...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    syncStats.endTime = new Date();

    console.log('Sync completed:', syncStats);

    // Store sync metadata in tenant settings
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        settings: {
          ...((tenant as any).settings || {}),
          lastOpenFacturaSync: {
            ...syncStats,
            startTime: syncStats.startTime.toISOString(),
            endTime: syncStats.endTime.toISOString()
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'OpenFactura sync completed successfully',
      stats: syncStats
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