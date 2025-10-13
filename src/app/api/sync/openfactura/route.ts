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
const OPENFACTURA_API_KEY = process.env.OPENFACTURA_API_KEY;

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

  // Add RUTRecep filter if available from options
  if (options.receiverRut) {
    payload.RUTRecep = { eq: options.receiverRut };
  }

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

async function fetchDocumentDetails(rut: string, type: number, folio: number): Promise<any> {
  if (!OPENFACTURA_API_KEY) {
    throw new Error('OPENFACTURA_API_KEY not configured');
  }

  const detailUrl = `${OPENFACTURA_DETAIL_URL}/${rut}/${type}/${folio}/json`;

  console.log(`Fetching document details: ${detailUrl}`);

  try {
    const response = await fetch(detailUrl, {
      method: 'GET',
      headers: {
        'apikey': OPENFACTURA_API_KEY,
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
      months: parseInt(url.searchParams.get('months') || requestBody.months || '0') // Alternative to fromDate
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

    // Get tenant from request or use first active tenant with RUT configured
    let tenantId = url.searchParams.get('tenantId') || requestBody.tenantId;
    let tenant;

    if (tenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId, isActive: true },
        select: { id: true, name: true, rut: true }
      });
    } else {
      // Find first active tenant that has a RUT configured for OpenFactura
      tenant = await prisma.tenant.findFirst({
        where: {
          isActive: true,
          rut: { not: null }
        },
        select: { id: true, name: true, rut: true }
      });
    }

    if (!tenant || !tenant.rut) {
      return NextResponse.json(
        {
          error: 'No configured tenant found',
          details: 'No active tenant with RUT found for OpenFactura integration'
        },
        { status: 404 }
      );
    }

    // Validate tenant RUT
    if (!validateRUT(tenant.rut)) {
      return NextResponse.json(
        {
          error: 'Invalid tenant RUT',
          details: `Tenant RUT ${tenant.rut} is not a valid Chilean RUT`
        },
        { status: 400 }
      );
    }

    // Get RUT number for filtering (receiver RUT)
    const companyRutNumber = getRUTNumber(tenant.rut);
    const companyRutFormatted = formatRUTForAPI(tenant.rut);

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
            toDate: chunk.to,
            receiverRut: companyRutNumber
          });
        syncStats.pages++;

        console.log(`Fetched page ${currentPage}/${pageData.last_page} with ${pageData.data.length} documents from OpenFactura for RUT ${companyRutFormatted}`);

        // Since we're filtering by RUTRecep in the API request, all returned documents
        // should already be for the correct receiving company
        const filteredDocuments = pageData.data;

        syncStats.totalDocuments += filteredDocuments.length;

        console.log(`Processing ${filteredDocuments.length} documents for tenant ${tenant.name} (${companyRutFormatted})`);

        // Process each document in the filtered page
        for (const doc of filteredDocuments) {
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

            // Fetch detailed document information including line items
            console.log(`Fetching details for document ${uniqueId}`);
            const documentDetails = await fetchDocumentDetails(
              `${doc.RUTEmisor}-${doc.DV}`,
              doc.TipoDTE,
              doc.Folio
            );

            // Small delay to be respectful to the API (250ms between detail requests)
            await new Promise(resolve => setTimeout(resolve, 250));

            // Create enhanced document data with details
            const enhancedDocData = enhanceDocumentWithDetails(doc, documentDetails);

            // Use actual receiver data from invoice, not tenant data
            // OpenFactura provides RUTRecep and RznSocRecep in the document
            const receiverRUT = doc.RUTRecep && doc.DVRecep
              ? `${doc.RUTRecep}-${doc.DVRecep}`
              : tenant.rut || '';
            const receiverName = doc.RznSocRecep || tenant.name;

            const documentData = {
              type: mapDocumentType(doc.TipoDTE),
              folio: doc.Folio.toString(),
              documentCode: doc.TipoDTE,
              emitterRUT: `${doc.RUTEmisor}-${doc.DV}`,
              emitterName: doc.RznSoc,
              receiverRUT,
              receiverName,
              netAmount: new Decimal(doc.MntNeto || 0),
              taxAmount: new Decimal(doc.IVA || 0),
              totalAmount: new Decimal(doc.MntTotal || 0),
              currency: 'CLP',
              issuedAt: new Date(doc.FchEmis),
              status: 'ISSUED' as TaxDocumentStatus, // All received documents are issued
              rawResponse: enhancedDocData as any,
              tenantId: tenant.id
            };

            // Extract line items for database storage
            const lineItems = enhancedDocData.detailedData?.lineItems || [];

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
              syncStats.updatedDocuments++;
            } else {
              // Create new document with line items
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