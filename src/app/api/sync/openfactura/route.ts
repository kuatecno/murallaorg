/**
 * OpenFactura Sync API
 * POST /api/sync/openfactura - Manual sync trigger
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TaxDocumentType, TaxDocumentStatus } from '@prisma/client';

const OPENFACTURA_API_URL = 'https://api.haulmer.com/v2/dte/document/received';
const OPENFACTURA_API_KEY = process.env.OPENFACTURA_API_KEY;
const COMPANY_RUT = '78188363';

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

function mapDocumentType(tipoDTE: number): TaxDocumentType {
  switch (tipoDTE) {
    case 33:
      return 'FACTURA';
    case 34:
      return 'FACTURA_EXENTA';
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
              netAmount: doc.MntNeto,
              taxAmount: doc.IVA,
              totalAmount: doc.MntTotal,
              currency: 'CLP',
              issuedAt: new Date(doc.FchEmis),
              status: 'APPROVED' as TaxDocumentStatus, // All received documents are approved
              rawResponse: doc as any,
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