/**
 * Test Prisma connection exactly as Next.js would use it
 */

import { PrismaClient } from '@prisma/client';

// Use the same singleton pattern as src/lib/prisma.ts
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

async function testConnection() {
  console.log('🧪 Testing Prisma Connection (as Next.js would use it)...\n');

  try {
    console.log('📊 Database URL being used:');
    console.log('   ', process.env.DATABASE_URL ? '✓ DATABASE_URL is set' : '✗ DATABASE_URL not set');
    console.log('   ', process.env.POSTGRES_PRISMA_URL ? '✓ POSTGRES_PRISMA_URL is set' : '✗ POSTGRES_PRISMA_URL not set');

    console.log('\n🔍 Testing basic query...');

    // Test 1: Simple count query
    const tenantCount = await prisma.tenant.count();
    console.log(`✅ Tenant count: ${tenantCount}`);

    // Test 2: Find first tenant
    const tenant = await prisma.tenant.findFirst();
    console.log(`✅ First tenant: ${tenant?.name} (${tenant?.id})`);

    // Test 3: Find first staff (this is where login API fails)
    console.log('\n🔍 Testing staff query (this is where login fails)...');
    const staff = await prisma.staff.findFirst();
    console.log(`✅ First staff: ${staff?.firstName} ${staff?.lastName}`);

    // Test 4: Query with where clause (like login does)
    const staffByEmail = await prisma.staff.findUnique({
      where: { email: 'contacto@murallacafe.cl' },
    });
    console.log(`✅ Staff by email: ${staffByEmail?.firstName} ${staffByEmail?.lastName}`);

    console.log('\n✅✅✅ All connection tests passed! 🎉');

  } catch (error: any) {
    console.error('\n❌ Connection test failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
