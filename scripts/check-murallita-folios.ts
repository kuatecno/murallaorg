import prisma from '../src/lib/prisma';

async function main() {
  // Folios from the screenshot
  const murallitaFolios = ['7123', '45255', '269351', '269350', '269349', '68821', '25239778'];

  console.log('🔍 Checking Murallita folios from screenshot...\n');

  for (const folio of murallitaFolios) {
    const doc = await prisma.taxDocument.findFirst({
      where: { folio },
      select: {
        folio: true,
        receiverRUT: true,
        receiverName: true,
        emitterName: true,
        totalAmount: true,
        issuedAt: true
      }
    });

    if (doc) {
      const hasReceiverRUT = doc.receiverRUT ? '✅ HAS' : '❌ NULL';
      console.log(`Folio ${folio}: ${hasReceiverRUT}`);
      console.log(`  Emitter: ${doc.emitterName}`);
      console.log(`  Receiver RUT: ${doc.receiverRUT || 'NULL'}`);
      console.log(`  Receiver Name: ${doc.receiverName || 'NULL'}`);
      console.log(`  Total: $${doc.totalAmount}`);
      console.log(`  Issued: ${doc.issuedAt?.toISOString().split('T')[0]}`);
      console.log('');
    } else {
      console.log(`Folio ${folio}: ❌ NOT FOUND IN DATABASE\n`);
    }
  }

  // Count how many have null receiver RUT
  const withNull = await prisma.taxDocument.count({
    where: { receiverRUT: null }
  });

  const withRUT = await prisma.taxDocument.count({
    where: { receiverRUT: { not: null } }
  });

  console.log('📊 Summary:');
  console.log(`  Invoices with receiver RUT: ${withRUT}`);
  console.log(`  Invoices with NULL receiver RUT: ${withNull}`);
  console.log(`  Total: ${withRUT + withNull}`);

  await prisma.$disconnect();
}

main();
