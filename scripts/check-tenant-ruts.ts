import prisma from '../src/lib/prisma';
import { getRUTNumber } from '../src/lib/chilean-utils';

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: { id: true, name: true, rut: true }
  });

  console.log('📋 Active tenants and their RUT numbers:\n');

  for (const t of tenants) {
    if (t.rut) {
      const rutNumber = getRUTNumber(t.rut);
      console.log(`  ${t.name}:`);
      console.log(`    RUT formatted: ${t.rut}`);
      console.log(`    RUT number:    ${rutNumber}`);
      console.log('');
    }
  }

  await prisma.$disconnect();
}

main();
