/**
 * Check tenant mapping and RUTs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking tenant RUT mapping...\n');

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true, rut: true }
  });

  console.log('Configured tenants:');
  tenants.forEach(t => {
    console.log(`  ${t.name} (${t.slug})`);
    console.log(`    ID:  ${t.id}`);
    console.log(`    RUT: ${t.rut}\n`);
  });

  console.log('Expected mapping:');
  console.log('  cmgopbny20000susjkold0hvj → Muralla SPA (78.188.363-8)');
  console.log('  cmftvluqd0000su0ht2z960f3 → Murallita (78.225.753-6)\n');

  // Check invoices with receiverRUT
  console.log('Invoices by receiver RUT:');

  const murallaSpaRUT = '78.188.363-8';
  const murallitaRUT = '78.225.753-6';

  const murallaSpaCount = await prisma.taxDocument.count({
    where: { receiverRUT: murallaSpaRUT }
  });

  const murallitaCount = await prisma.taxDocument.count({
    where: { receiverRUT: murallitaRUT }
  });

  console.log(`  ${murallaSpaRUT}: ${murallaSpaCount} invoices`);
  console.log(`  ${murallitaRUT}: ${murallitaCount} invoices\n`);

  // Sample invoices for each RUT
  console.log('Sample invoices for Muralla SPA (78.188.363-8):');
  const murallaSamples = await prisma.taxDocument.findMany({
    where: { receiverRUT: murallaSpaRUT },
    take: 3,
    select: {
      folio: true,
      emitterName: true,
      totalAmount: true,
      receiverRUT: true,
      receiverName: true,
      tenant: { select: { name: true } }
    }
  });

  murallaSamples.forEach(s => {
    console.log(`  Folio ${s.folio}: ${s.emitterName} → ${s.receiverName} (${s.receiverRUT}) [Tenant: ${s.tenant.name}]`);
  });

  console.log('\nSample invoices for Murallita (78.225.753-6):');
  const murallitaSamples = await prisma.taxDocument.findMany({
    where: { receiverRUT: murallitaRUT },
    take: 3,
    select: {
      folio: true,
      emitterName: true,
      totalAmount: true,
      receiverRUT: true,
      receiverName: true,
      tenant: { select: { name: true } }
    }
  });

  if (murallitaSamples.length > 0) {
    murallitaSamples.forEach(s => {
      console.log(`  Folio ${s.folio}: ${s.emitterName} → ${s.receiverName} (${s.receiverRUT}) [Tenant: ${s.tenant.name}]`);
    });
  } else {
    console.log('  No invoices found!');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
