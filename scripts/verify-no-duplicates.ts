/**
 * Verify no duplicate invoices exist in the database
 * Check for duplicates across:
 * 1. Same folio with different tenants
 * 2. Same (emitterRUT, folio, tenantId) combination
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for duplicate invoices...\n');

  // Get all tenants
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true, rut: true }
  });

  console.log('Tenants:');
  tenants.forEach(t => {
    console.log(`  - ${t.name} (${t.slug}): ${t.rut}`);
  });
  console.log('');

  // 1. Check for duplicate (emitterRUT, folio, tenantId) combinations
  console.log('1️⃣  Checking for duplicate (emitterRUT, folio, tenantId)...');
  const duplicates = await prisma.$queryRaw<Array<{
    emitterRUT: string;
    folio: string;
    tenantId: string;
    count: bigint;
  }>>`
    SELECT "emitterRUT", "folio", "tenantId", COUNT(*) as count
    FROM "tax_documents"
    GROUP BY "emitterRUT", "folio", "tenantId"
    HAVING COUNT(*) > 1
  `;

  if (duplicates.length > 0) {
    console.log(`❌ Found ${duplicates.length} duplicate combinations:`);
    duplicates.forEach(d => {
      console.log(`   - ${d.emitterRUT} / ${d.folio} / ${d.tenantId}: ${d.count} copies`);
    });
  } else {
    console.log('✅ No duplicates found for (emitterRUT, folio, tenantId)\n');
  }

  // 2. Check for same folio across different tenants (this is OK, just informational)
  console.log('2️⃣  Checking folios that exist for both tenants...');
  const sharedFolios = await prisma.$queryRaw<Array<{
    emitterRUT: string;
    folio: string;
    tenantCount: bigint;
  }>>`
    SELECT "emitterRUT", "folio", COUNT(DISTINCT "tenantId") as "tenantCount"
    FROM "tax_documents"
    GROUP BY "emitterRUT", "folio"
    HAVING COUNT(DISTINCT "tenantId") > 1
  `;

  if (sharedFolios.length > 0) {
    console.log(`ℹ️  Found ${sharedFolios.length} folios that exist for multiple tenants (this is normal):`);
    for (const sf of sharedFolios.slice(0, 5)) {
      const details = await prisma.taxDocument.findMany({
        where: {
          emitterRUT: sf.emitterRUT,
          folio: sf.folio
        },
        select: {
          folio: true,
          emitterRUT: true,
          receiverRUT: true,
          receiverName: true,
          totalAmount: true,
          tenant: { select: { name: true } }
        }
      });

      console.log(`\n   Folio ${sf.folio} from ${sf.emitterRUT}:`);
      details.forEach(d => {
        console.log(`     → ${d.tenant.name}: Receiver ${d.receiverRUT} (${d.receiverName}) - $${d.totalAmount}`);
      });
    }
    if (sharedFolios.length > 5) {
      console.log(`   ... and ${sharedFolios.length - 5} more\n`);
    }
  } else {
    console.log('ℹ️  No folios shared across tenants\n');
  }

  // 3. Count invoices per tenant
  console.log('3️⃣  Invoice counts per tenant:');
  for (const tenant of tenants) {
    const count = await prisma.taxDocument.count({
      where: { tenantId: tenant.id }
    });
    console.log(`   - ${tenant.name}: ${count} invoices`);
  }

  console.log('\n✅ Verification complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error verifying duplicates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
