/**
 * Create Initial Tenant
 * Run this to create the first tenant for Muralla
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏢 Creating initial tenant for Muralla...\n');

  // Check if tenant already exists
  const existing = await prisma.tenant.findFirst({
    where: { slug: 'muralla-cafe' }
  });

  if (existing) {
    console.log('✅ Tenant already exists!');
    console.log(`   Name: ${existing.name}`);
    console.log(`   Slug: ${existing.slug}`);
    console.log(`   ID: ${existing.id}\n`);
    return existing;
  }

  // Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Muralla Café',
      slug: 'muralla-cafe',
      rut: '77777777-7',
      email: 'contacto@murallacafe.cl',
      phone: '+56912345678',
      address: 'Santiago, Chile',
      isActive: true,
      settings: {},
      features: [],
    }
  });

  console.log('✅ Tenant created successfully!\n');
  console.log(`   Name: ${tenant.name}`);
  console.log(`   Slug: ${tenant.slug}`);
  console.log(`   ID: ${tenant.id}`);
  console.log(`   Email: ${tenant.email}\n`);

  return tenant;
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
