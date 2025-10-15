import prisma from '../src/lib/prisma';

async function main() {
  console.log('🔍 Searching for expected folios in database...\n');

  const f1 = await prisma.taxDocument.findMany({
    where: { folio: '12654' },
    select: {
      folio: true,
      receiverRUT: true,
      receiverName: true,
      emitterRUT: true,
      emitterName: true,
      tenantId: true
    }
  });

  const f2 = await prisma.taxDocument.findMany({
    where: { folio: '7123' },
    select: {
      folio: true,
      receiverRUT: true,
      receiverName: true,
      emitterRUT: true,
      emitterName: true,
      tenantId: true
    }
  });

  console.log('Folio 12654:', f1.length > 0 ? '✅ FOUND' : '❌ NOT FOUND');
  if (f1.length > 0) {
    console.log('  ReceiverRUT:', f1[0].receiverRUT);
    console.log('  ReceiverName:', f1[0].receiverName);
    console.log('  EmitterRUT:', f1[0].emitterRUT);
    console.log('  EmitterName:', f1[0].emitterName);
    console.log('  TenantId:', f1[0].tenantId);
  }

  console.log('\nFolio 7123:', f2.length > 0 ? '✅ FOUND' : '❌ NOT FOUND');
  if (f2.length > 0) {
    console.log('  ReceiverRUT:', f2[0].receiverRUT);
    console.log('  ReceiverName:', f2[0].receiverName);
    console.log('  EmitterRUT:', f2[0].emitterRUT);
    console.log('  EmitterName:', f2[0].emitterName);
    console.log('  TenantId:', f2[0].tenantId);
  }

  // Also check total invoices per tenant
  const muralla = await prisma.tenant.findFirst({
    where: { name: 'Muralla SPA' },
    select: { id: true, rut: true }
  });
  const murallita = await prisma.tenant.findFirst({
    where: { name: { contains: 'Murallita' } },
    select: { id: true, rut: true }
  });

  const murallaCount = await prisma.taxDocument.count({ where: { tenantId: muralla?.id } });
  const murallitaCount = await prisma.taxDocument.count({ where: { tenantId: murallita?.id } });

  console.log('\n📊 Total invoices per tenant:');
  console.log(`  Muralla SPA (${muralla?.rut}): ${murallaCount}`);
  console.log(`  Murallita (${murallita?.rut}): ${murallitaCount}`);

  await prisma.$disconnect();
}

main();
