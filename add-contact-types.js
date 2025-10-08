/**
 * Migration Script: Add new contact types to ContactType enum
 * Adds: BRAND, AGENT, COURIER, INFLUENCER
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addContactTypes() {
  console.log('🔄 Adding new contact types to ContactType enum\n');

  try {
    // Add new values to ContactType enum
    console.log('📝 Adding BRAND, AGENT, COURIER, INFLUENCER to ContactType enum...');

    await prisma.$executeRawUnsafe(`
      ALTER TYPE "ContactType" ADD VALUE IF NOT EXISTS 'BRAND'
    `);
    console.log('   ✅ Added BRAND');

    await prisma.$executeRawUnsafe(`
      ALTER TYPE "ContactType" ADD VALUE IF NOT EXISTS 'AGENT'
    `);
    console.log('   ✅ Added AGENT');

    await prisma.$executeRawUnsafe(`
      ALTER TYPE "ContactType" ADD VALUE IF NOT EXISTS 'COURIER'
    `);
    console.log('   ✅ Added COURIER');

    await prisma.$executeRawUnsafe(`
      ALTER TYPE "ContactType" ADD VALUE IF NOT EXISTS 'INFLUENCER'
    `);
    console.log('   ✅ Added INFLUENCER');

    console.log('\n✅ Migration completed successfully!');
    console.log('📌 Next step: Generate Prisma client with: npx prisma generate\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
addContactTypes();
