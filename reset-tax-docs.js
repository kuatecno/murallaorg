const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function resetTaxDocuments() {
  console.log('🗑️  Deleting all tax documents and items...')

  // Delete all tax document items first (due to foreign key)
  const deletedItems = await prisma.taxDocumentItem.deleteMany({})
  console.log(`   Deleted ${deletedItems.count} tax document items`)

  // Delete all tax documents
  const deletedDocs = await prisma.taxDocument.deleteMany({})
  console.log(`   Deleted ${deletedDocs.count} tax documents`)

  console.log('✅ Database cleaned successfully!')

  await prisma.$disconnect()
}

resetTaxDocuments()
  .catch(console.error)
  .finally(() => process.exit())
