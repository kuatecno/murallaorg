import prisma from '../src/lib/prisma';

async function main() {
  console.log('📄 Invoices with NULL receiver RUT:\n');

  const nullDocs = await prisma.taxDocument.findMany({
    where: { receiverRUT: null },
    select: {
      folio: true,
      emitterName: true,
      totalAmount: true,
      issuedAt: true
    },
    orderBy: { issuedAt: 'desc' },
    take: 20
  });

  console.log(`Found ${nullDocs.length} invoices (showing first 20):\n`);

  for (const doc of nullDocs) {
    console.log(`  Folio ${doc.folio} - ${doc.emitterName}`);
    console.log(`    Issued: ${doc.issuedAt?.toISOString().split('T')[0]}`);
    console.log(`    Total: $${doc.totalAmount}`);
    console.log('');
  }

  await prisma.$disconnect();
}

main();
