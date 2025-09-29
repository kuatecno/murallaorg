/**
 * Tax Documents Cleanup API
 * POST /api/cleanup/tax-documents - Clean up incorrectly attributed tax documents
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/cleanup/tax-documents
 * Clean up tax documents that may be incorrectly attributed to wrong tenants
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dryRun = body.dryRun ?? true; // Default to dry run for safety

    console.log(`Starting tax documents cleanup (${dryRun ? 'DRY RUN' : 'LIVE MODE'})...`);

    // Get all active tenants with their RUTs
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true, rut: { not: null } },
      select: { id: true, name: true, rut: true }
    });

    if (tenants.length === 0) {
      return NextResponse.json({
        error: 'No active tenants with RUT found',
        success: false
      }, { status: 404 });
    }

    console.log(`Found ${tenants.length} active tenants with RUTs`);

    let cleanupStats = {
      totalDocuments: 0,
      documentsToMove: 0,
      documentsToDelete: 0,
      moveOperations: [] as Array<{
        documentId: string;
        folio: string;
        currentTenant: string;
        correctTenant: string;
        receiverRUT: string;
      }>,
      deleteOperations: [] as Array<{
        documentId: string;
        folio: string;
        tenant: string;
        reason: string;
      }>,
      errors: 0
    };

    // Process each tenant
    for (const tenant of tenants) {
      console.log(`Checking documents for tenant: ${tenant.name} (${tenant.rut})`);

      // Get all tax documents for this tenant
      const documents = await prisma.taxDocument.findMany({
        where: { tenantId: tenant.id },
        select: {
          id: true,
          folio: true,
          receiverRUT: true,
          emitterRUT: true,
          emitterName: true,
          totalAmount: true,
          issuedAt: true
        }
      });

      cleanupStats.totalDocuments += documents.length;
      console.log(`  Found ${documents.length} documents for tenant ${tenant.name}`);

      // Check each document
      for (const doc of documents) {
        // Clean and normalize RUTs for comparison
        if (!tenant.rut) {
          console.log(`  ⚠️  Tenant ${tenant.name} has no RUT - skipping document checks`);
          continue;
        }

        const tenantRutClean = tenant.rut.replace(/[.-]/g, '');

        if (!doc.receiverRUT) {
          console.log(`  ⚠️  Document ${doc.folio} has no receiver RUT - skipping`);
          continue;
        }

        const docReceiverRutClean = doc.receiverRUT.replace(/[.-]/g, '');

        // Check if the document's receiver RUT matches the tenant's RUT
        if (tenantRutClean !== docReceiverRutClean) {
          // This document might be incorrectly attributed

          // Try to find the correct tenant for this document
          let correctTenant = tenants.find(t => {
            const tRutClean = t.rut.replace(/[.-]/g, '');
            return tRutClean === docReceiverRutClean;
          });

          // If no exact match, try to find close matches (handle potential typos)
          if (!correctTenant) {
            correctTenant = tenants.find(t => {
              const tRutClean = t.rut.replace(/[.-]/g, '');
              // Check if RUTs are similar (same first 7 digits - common typo pattern)
              const tRutBase = tRutClean.substring(0, 7);
              const docRutBase = docReceiverRutClean.substring(0, 7);
              return tRutBase === docRutBase && tRutClean.length === docReceiverRutClean.length;
            });

            if (correctTenant) {
              console.log(`  ⚠️  Found potential typo match: ${doc.receiverRUT} ≈ ${correctTenant.rut}`);
            }
          }

          if (correctTenant) {
            // Found correct tenant - schedule move operation
            cleanupStats.documentsToMove++;
            cleanupStats.moveOperations.push({
              documentId: doc.id,
              folio: doc.folio,
              currentTenant: tenant.name,
              correctTenant: correctTenant.name,
              receiverRUT: doc.receiverRUT
            });

            console.log(`  ❌ Document ${doc.folio} (${doc.receiverRUT}) should be moved from ${tenant.name} to ${correctTenant.name}`);
          } else {
            // No matching tenant found - might be orphaned or from external RUT
            cleanupStats.documentsToDelete++;
            cleanupStats.deleteOperations.push({
              documentId: doc.id,
              folio: doc.folio,
              tenant: tenant.name,
              reason: `No tenant found for receiver RUT: ${doc.receiverRUT}`
            });

            console.log(`  ⚠️  Document ${doc.folio} (${doc.receiverRUT}) has no matching tenant - scheduled for review`);
          }
        } else {
          console.log(`  ✅ Document ${doc.folio} correctly attributed to ${tenant.name}`);
        }
      }
    }

    // Perform cleanup operations if not in dry run mode
    if (!dryRun && (cleanupStats.moveOperations.length > 0 || cleanupStats.deleteOperations.length > 0)) {
      console.log('Executing cleanup operations...');

      // Execute move operations
      for (const moveOp of cleanupStats.moveOperations) {
        try {
          const correctTenant = tenants.find(t => t.name === moveOp.correctTenant);
          if (correctTenant) {
            await prisma.taxDocument.update({
              where: { id: moveOp.documentId },
              data: {
                tenantId: correctTenant.id,
                updatedAt: new Date()
              }
            });
            console.log(`  ✅ Moved document ${moveOp.folio} to ${moveOp.correctTenant}`);
          }
        } catch (error) {
          console.error(`  ❌ Failed to move document ${moveOp.folio}:`, error);
          cleanupStats.errors++;
        }
      }

      // Execute delete operations (be very careful with this)
      for (const deleteOp of cleanupStats.deleteOperations) {
        try {
          // For now, let's just mark these in logs and not actually delete
          console.log(`  ⚠️  Would delete document ${deleteOp.folio} from ${deleteOp.tenant}: ${deleteOp.reason}`);
          // Uncomment below to actually delete - BE VERY CAREFUL
          // await prisma.taxDocument.delete({
          //   where: { id: deleteOp.documentId }
          // });
        } catch (error) {
          console.error(`  ❌ Failed to delete document ${deleteOp.folio}:`, error);
          cleanupStats.errors++;
        }
      }
    }

    const summary = {
      success: true,
      dryRun,
      stats: cleanupStats,
      message: dryRun
        ? `Dry run completed. Found ${cleanupStats.documentsToMove} documents to move and ${cleanupStats.documentsToDelete} documents to review.`
        : `Cleanup completed. Moved ${cleanupStats.documentsToMove} documents, reviewed ${cleanupStats.documentsToDelete} documents.`
    };

    console.log('Cleanup summary:', summary);
    return NextResponse.json(summary);

  } catch (error) {
    console.error('Tax documents cleanup failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/cleanup/tax-documents
 * Get info about cleanup operations that would be performed
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/cleanup/tax-documents',
    method: 'POST',
    description: 'Clean up tax documents that may be incorrectly attributed to wrong tenants',
    note: 'Use dryRun: true (default) to preview changes before applying them',
    parameters: {
      dryRun: 'boolean - If true, only analyzes and reports issues without making changes (default: true)'
    },
    exampleRequest: {
      dryRun: true
    }
  });
}