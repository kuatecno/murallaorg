/**
 * Migration Script: Remove BOTH contact type
 * Migrates any contacts with type BOTH to CUSTOMER
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeBothContactType() {
  console.log('🔄 Checking for contacts with BOTH type\n');

  try {
    // Check if any contacts have BOTH type
    const bothContacts = await prisma.$queryRaw`
      SELECT id, code, name, "contactType"
      FROM contacts
      WHERE "contactType" = 'BOTH'
    `;

    if (bothContacts.length === 0) {
      console.log('✅ No contacts with BOTH type found. Safe to proceed.\n');
    } else {
      console.log(`⚠️  Found ${bothContacts.length} contact(s) with BOTH type:`);
      bothContacts.forEach(contact => {
        console.log(`   - ${contact.code}: ${contact.name}`);
      });

      console.log('\n📝 Migrating BOTH contacts to CUSTOMER...');

      await prisma.$executeRawUnsafe(`
        UPDATE contacts
        SET "contactType" = 'CUSTOMER'::"ContactType"
        WHERE "contactType" = 'BOTH'::"ContactType"
      `);

      console.log(`   ✅ Migrated ${bothContacts.length} contact(s) to CUSTOMER\n`);
    }

    // Now remove BOTH from the enum
    console.log('🗑️  Attempting to remove BOTH value from ContactType enum...');

    // Note: PostgreSQL doesn't support removing enum values directly
    // We need to create a new enum and migrate
    console.log('   ⚠️  Cannot remove enum value from PostgreSQL directly');
    console.log('   ℹ️  The BOTH value will remain in the database enum but unused in schema\n');

    console.log('✅ Migration completed successfully!');
    console.log('📌 Next step: Run npx prisma generate\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
removeBothContactType();
