import prisma from '../src/lib/prisma';

async function main() {
  console.log('🗑️  Cleaning database...\n');

  console.log('Deleting all tax document items...');
  const itemsDeleted = await prisma.taxDocumentItem.deleteMany({});
  console.log(`  ✅ Deleted ${itemsDeleted.count} items`);

  console.log('\nDeleting all tax documents...');
  const docsDeleted = await prisma.taxDocument.deleteMany({});
  console.log(`  ✅ Deleted ${docsDeleted.count} documents`);

  console.log('\n✅ Database cleaned successfully!\n');

  await prisma.$disconnect();
}

main();
