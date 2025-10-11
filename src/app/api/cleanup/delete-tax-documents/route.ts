/**
 * Safe Tax Documents Deletion API
 * POST /api/cleanup/delete-tax-documents - Safely delete only tax documents
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/cleanup/delete-tax-documents
 * Safely delete only tax documents and items while preserving all other data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const confirmDelete = body.confirmDelete ?? false;

    if (!confirmDelete) {
      return NextResponse.json({
        error: 'Confirmation required',
        message: 'Set confirmDelete: true to proceed with deletion',
        success: false
      }, { status: 400 });
    }

    console.log('Starting safe tax documents deletion...');

    // Get counts before deletion for reporting
    const beforeCounts = {
      taxDocuments: await prisma.taxDocument.count(),
      taxDocumentItems: await prisma.taxDocumentItem.count(),
      tenants: await prisma.tenant.count(),
      contacts: await prisma.contact.count(),
      transactions: await prisma.transaction.count()
    };

    console.log('Before deletion counts:', beforeCounts);

    let deletionStats = {
      deletedTaxDocumentItems: 0,
      deletedTaxDocuments: 0,
      errors: 0,
      startTime: new Date(),
      endTime: null as Date | null
    };

    // Step 1: Delete all tax document items first (foreign key constraint)
    console.log('Deleting tax document items...');
    const deleteItemsResult = await prisma.taxDocumentItem.deleteMany({});
    deletionStats.deletedTaxDocumentItems = deleteItemsResult.count;
    console.log(`Deleted ${deleteItemsResult.count} tax document items`);

    // Step 2: Delete all tax documents
    console.log('Deleting tax documents...');
    const deleteDocsResult = await prisma.taxDocument.deleteMany({});
    deletionStats.deletedTaxDocuments = deleteDocsResult.count;
    console.log(`Deleted ${deleteDocsResult.count} tax documents`);

    // Get counts after deletion for verification
    const afterCounts = {
      taxDocuments: await prisma.taxDocument.count(),
      taxDocumentItems: await prisma.taxDocumentItem.count(),
      tenants: await prisma.tenant.count(),
      contacts: await prisma.contact.count(),
      transactions: await prisma.transaction.count()
    };

    console.log('After deletion counts:', afterCounts);

    deletionStats.endTime = new Date();

    // Verify that we only deleted tax document data
    const preservedDataIntact = (
      afterCounts.tenants === beforeCounts.tenants &&
      afterCounts.contacts === beforeCounts.contacts &&
      afterCounts.transactions === beforeCounts.transactions &&
      afterCounts.taxDocuments === 0 &&
      afterCounts.taxDocumentItems === 0
    );

    if (!preservedDataIntact) {
      console.error('WARNING: Other data may have been affected!');
      return NextResponse.json({
        success: false,
        error: 'Data integrity check failed',
        beforeCounts,
        afterCounts,
        deletionStats
      }, { status: 500 });
    }

    const summary = {
      success: true,
      message: 'Tax documents safely deleted. All other data preserved.',
      deletionStats,
      beforeCounts,
      afterCounts,
      dataIntegrityCheck: {
        tenantsPreserved: afterCounts.tenants === beforeCounts.tenants,
        contactsPreserved: afterCounts.contacts === beforeCounts.contacts,
        transactionsPreserved: afterCounts.transactions === beforeCounts.transactions,
        taxDocumentsCleared: afterCounts.taxDocuments === 0,
        taxDocumentItemsCleared: afterCounts.taxDocumentItems === 0
      }
    };

    console.log('Safe deletion completed successfully:', summary);
    return NextResponse.json(summary);

  } catch (error) {
    console.error('Tax documents deletion failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Deletion failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/cleanup/delete-tax-documents
 * Get info about what will be deleted
 */
export async function GET() {
  try {
    const counts = {
      taxDocuments: await prisma.taxDocument.count(),
      taxDocumentItems: await prisma.taxDocumentItem.count(),
      tenants: await prisma.tenant.count(),
      contacts: await prisma.contact.count(),
      transactions: await prisma.transaction.count()
    };

    return NextResponse.json({
      endpoint: '/api/cleanup/delete-tax-documents',
      method: 'POST',
      description: 'Safely delete only tax documents and items while preserving all other data',
      currentCounts: counts,
      willDelete: {
        taxDocuments: counts.taxDocuments,
        taxDocumentItems: counts.taxDocumentItems
      },
      willPreserve: {
        tenants: counts.tenants,
        contacts: counts.contacts,
        transactions: counts.transactions
      },
      exampleRequest: {
        confirmDelete: true
      },
      warning: 'This will permanently delete all tax documents. Set confirmDelete: true to proceed.'
    });

  } catch (error) {
    console.error('Error getting deletion info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get deletion info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}