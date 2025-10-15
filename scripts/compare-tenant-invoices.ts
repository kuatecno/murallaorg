import prisma from '../src/lib/prisma';

async function main() {
  console.log('🔍 Comparing invoices between tenants...\n');

  const muralla = await prisma.tenant.findFirst({
    where: { name: 'Muralla SPA' },
    select: { id: true, name: true, rut: true }
  });

  const murallita = await prisma.tenant.findFirst({
    where: { name: { contains: 'Murallita' } },
    select: { id: true, name: true, rut: true }
  });

  if (!muralla || !murallita) {
    console.error('❌ Tenants not found');
    await prisma.$disconnect();
    return;
  }

  // Get sample invoices from each tenant
  const murallaInvoices = await prisma.taxDocument.findMany({
    where: { tenantId: muralla.id },
    select: { folio: true, receiverRUT: true, emitterRUT: true, emitterName: true },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  const murallitaInvoices = await prisma.taxDocument.findMany({
    where: { tenantId: murallita.id },
    select: { folio: true, receiverRUT: true, emitterRUT: true, emitterName: true },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  console.log(`📄 Latest 10 invoices for ${muralla.name} (${muralla.rut}):`);
  murallaInvoices.forEach(inv => {
    console.log(`  Folio ${inv.folio} - Receiver: ${inv.receiverRUT} - From: ${inv.emitterName}`);
  });

  console.log(`\n📄 Latest 10 invoices for ${murallita.name} (${murallita.rut}):`);
  murallitaInvoices.forEach(inv => {
    console.log(`  Folio ${inv.folio} - Receiver: ${inv.receiverRUT} - From: ${inv.emitterName}`);
  });

  // Check if they have the same folios
  const murallaFolios = new Set(murallaInvoices.map(i => i.folio));
  const murallitaFolios = new Set(murallitaInvoices.map(i => i.folio));

  const commonFolios = [...murallaFolios].filter(f => murallitaFolios.has(f));

  if (commonFolios.length > 0) {
    console.log(`\n⚠️  Found ${commonFolios.length} IDENTICAL folios between both tenants!`);
    console.log('Common folios:', commonFolios.join(', '));
  } else {
    console.log('\n✅ No identical folios found - invoices are properly separated!');
  }

  // Check receiverRUT distribution
  const murallaReceivers = new Set(murallaInvoices.map(i => i.receiverRUT).filter(Boolean));
  const murallitaReceivers = new Set(murallitaInvoices.map(i => i.receiverRUT).filter(Boolean));

  console.log(`\n📊 Receiver RUTs found:`);
  console.log(`  ${muralla.name} invoices have receivers:`, [...murallaReceivers]);
  console.log(`  ${murallita.name} invoices have receivers:`, [...murallitaReceivers]);

  await prisma.$disconnect();
}

main();
