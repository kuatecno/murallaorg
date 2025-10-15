import prisma from '../src/lib/prisma';

async function main() {
  const murallita = await prisma.tenant.findFirst({
    where: { name: { contains: 'Murallita' } }
  });

  if (!murallita) {
    console.log('Murallita tenant not found');
    return;
  }

  const docs = await prisma.taxDocument.findMany({
    where: { tenantId: murallita.id },
    select: { folio: true, emitterName: true, totalAmount: true, issuedAt: true },
    take: 20,
    orderBy: { issuedAt: 'desc' }
  });

  console.log(`\nMurallita documents (${docs.length} shown):\n`);
  docs.forEach(d => console.log(`  ${d.folio} - ${d.emitterName} - $${d.totalAmount} - ${d.issuedAt?.toISOString().split('T')[0]}`));

  await prisma.$disconnect();
}

main();
