/**
 * Delete all tax documents (invoices) from the database
 * This will clean up duplicates before re-syncing with unique constraint
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Starting invoice deletion...\n');

  // First delete tax document items (they have foreign key to tax_documents)
  const itemsDeleted = await prisma.taxDocumentItem.deleteMany({});
  console.log(`✅ Deleted ${itemsDeleted.count} tax document items`);

  // Then delete all tax documents
  const taxDocsDeleted = await prisma.taxDocument.deleteMany({});
  console.log(`✅ Deleted ${taxDocsDeleted.count} tax documents\n`);

  console.log('🎉 All invoices deleted successfully!');
  console.log('Ready to apply unique constraint and re-sync.');
}

main()
  .catch((e) => {
    console.error('❌ Error deleting invoices:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
