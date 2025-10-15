import prisma from '../src/lib/prisma';

async function main() {
  console.log('🔍 Searching for Murallita invoices (RUT contains 78225753)...\n');

  // Check for Murallita RUT 78225753
  const murallitaDocs = await prisma.taxDocument.findMany({
    where: {
      receiverRUT: {
        contains: '78225753'
      }
    },
    select: {
      folio: true,
      receiverRUT: true,
      emitterName: true,
      totalAmount: true,
      issuedAt: true
    },
    orderBy: { issuedAt: 'desc' }
  });

  console.log(`Found: ${murallitaDocs.length} invoices\n`);

  if (murallitaDocs.length > 0) {
    murallitaDocs.forEach(doc => {
      console.log(`Folio ${doc.folio} - ${doc.emitterName}`);
      console.log(`  Receiver: ${doc.receiverRUT}`);
      console.log(`  Total: $${doc.totalAmount}`);
      console.log(`  Issued: ${doc.issuedAt?.toISOString().split('T')[0]}`);
      console.log('');
    });
  } else {
    console.log('❌ NO INVOICES FOUND WITH MURALLITA RECEIVER RUT (78225753)');
    console.log('\nThis means the OpenFactura API is NOT returning Murallita invoices!');
  }

  await prisma.$disconnect();
}

main();
