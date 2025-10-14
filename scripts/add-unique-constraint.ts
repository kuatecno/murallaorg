/**
 * Add unique constraint to tax_documents table
 * Constraint: (emitterRUT, folio, tenantId)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Adding unique constraint to tax_documents...\n');

  try {
    // Add unique constraint using raw SQL
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "tax_documents_emitterRUT_folio_tenantId_key"
      ON "tax_documents"("emitterRUT", "folio", "tenantId")
    `;

    console.log('✅ Unique constraint added successfully!');
    console.log('   Index: tax_documents_emitterRUT_folio_tenantId_key');
    console.log('   Columns: [emitterRUT, folio, tenantId]\n');
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('ℹ️  Unique constraint already exists');
    } else {
      throw error;
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Error adding unique constraint:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
