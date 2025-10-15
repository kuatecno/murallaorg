import prisma from '../src/lib/prisma';
import { getRUTNumber } from '../src/lib/chilean-utils';

async function main() {
  const docs = await prisma.taxDocument.findMany({
    select: { receiverRUT: true, folio: true, emitterName: true, tenantId: true },
    take: 20,
    orderBy: { createdAt: 'desc' }
  });

  console.log('📄 Sample invoices with receiver RUTs:\n');
  for (const doc of docs) {
    const rutNum = doc.receiverRUT ? getRUTNumber(doc.receiverRUT) : 'none';
    console.log(`  Folio ${doc.folio} - Receiver: ${doc.receiverRUT} → ${rutNum} (tenant: ${doc.tenantId.substring(0,8)}...)`);
  }

  // Count by receiver RUT
  const allDocs = await prisma.taxDocument.findMany({
    select: { receiverRUT: true }
  });

  const counts: Record<string, number> = {};
  for (const doc of allDocs) {
    if (doc.receiverRUT) {
      const rutNum = getRUTNumber(doc.receiverRUT);
      counts[rutNum] = (counts[rutNum] || 0) + 1;
    }
  }

  console.log('\n📊 Invoice count by receiver RUT:');
  for (const [rut, count] of Object.entries(counts)) {
    console.log(`  RUT ${rut}: ${count} invoices`);
  }

  await prisma.$disconnect();
}

main();
