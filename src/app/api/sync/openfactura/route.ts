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

async function fetchOpenFacturaPage(page: number = 1): Promise<OpenFacturaResponse> {
  if (!OPENFACTURA_API_KEY) {
    throw new Error('OPENFACTURA_API_KEY not configured');
  }

  const payload = {
    Page: page.toString(),
    // Get documents from last 90 days by default
    FchEmis: {
      gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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

export async function POST(request: NextRequest) {
  try {
    console.log('Starting OpenFactura sync...');

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

    let syncStats = {
      totalDocuments: 0,
      newDocuments: 0,
      updatedDocuments: 0,
      skippedDocuments: 0,
      errors: 0,
      startTime: new Date(),
      endTime: null as Date | null,
      pages: 0
    };

    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      try {
        const pageData = await fetchOpenFacturaPage(currentPage);
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