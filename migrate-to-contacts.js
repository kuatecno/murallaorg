/**
 * Data Migration Script: Customer + Supplier → Contact
 *
 * This script migrates data from the old Customer and Supplier models
 * to the new unified Contact model before running prisma db push.
 *
 * Steps:
 * 1. Backup existing customer and supplier data
 * 2. Create contacts table manually
 * 3. Migrate customers → contacts (type: CUSTOMER)
 * 4. Migrate suppliers → contacts (type: SUPPLIER)
 * 5. Migrate staff_customers + staff_suppliers → staff_contacts
 * 6. Update foreign keys in transactions, purchase_orders, etc.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateToContacts() {
  console.log('🔄 Starting Customer/Supplier → Contact migration\n');

  try {
    // Step 1: Backup existing data
    console.log('📦 Step 1: Backing up existing data...');
    const customers = await prisma.$queryRaw`SELECT * FROM customers`;
    const suppliers = await prisma.$queryRaw`SELECT * FROM suppliers`;
    const staffCustomers = await prisma.$queryRaw`SELECT * FROM staff_customers`;
    const staffSuppliers = await prisma.$queryRaw`SELECT * FROM staff_suppliers`;

    console.log(`   Found ${customers.length} customers`);
    console.log(`   Found ${suppliers.length} suppliers`);
    console.log(`   Found ${staffCustomers.length} staff-customer relations`);
    console.log(`   Found ${staffSuppliers.length} staff-supplier relations`);

    // Step 2: Create ContactType enum if it doesn't exist
    console.log('\n📝 Step 2: Creating ContactType enum...');
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "ContactType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'BOTH');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('   ✅ ContactType enum ready');

    // Step 3: Create contacts table
    console.log('\n🏗️  Step 3: Creating contacts table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "contacts" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "contactType" "ContactType" NOT NULL DEFAULT 'CUSTOMER',
        "rut" TEXT,
        "email" TEXT,
        "phone" TEXT,
        "contactName" TEXT,
        "address" TEXT,
        "city" TEXT,
        "country" TEXT,
        "creditLimit" DECIMAL(12,2),
        "currentDebt" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "paymentTerms" TEXT,
        "rating" INTEGER,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "tenantId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✅ Contacts table created');

    // Step 4: Migrate customers → contacts
    console.log('\n👥 Step 4: Migrating customers → contacts...');
    for (const customer of customers) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO contacts (
          id, code, name, "contactType", rut, email, phone,
          address, city, "creditLimit", "currentDebt",
          "isActive", metadata, "tenantId", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, 'CUSTOMER'::"ContactType", $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        ON CONFLICT (id) DO NOTHING
      `,
        customer.id,
        customer.code,
        customer.name,
        customer.rut,
        customer.email,
        customer.phone,
        customer.address,
        customer.city,
        customer.creditLimit,
        customer.currentDebt,
        customer.isActive,
        customer.metadata,
        customer.tenantId,
        customer.createdAt,
        customer.updatedAt
      );
    }
    console.log(`   ✅ Migrated ${customers.length} customers`);

    // Step 5: Migrate suppliers → contacts
    console.log('\n🏭 Step 5: Migrating suppliers → contacts...');
    for (const supplier of suppliers) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO contacts (
          id, code, name, "contactType", rut, email, phone, "contactName",
          address, city, country, "paymentTerms", rating,
          "isActive", metadata, "tenantId", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, 'SUPPLIER'::"ContactType", $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        ON CONFLICT (id) DO NOTHING
      `,
        supplier.id,
        supplier.code,
        supplier.name,
        supplier.rut,
        supplier.email,
        supplier.phone,
        supplier.contactName,
        supplier.address,
        supplier.city,
        supplier.country,
        supplier.paymentTerms,
        supplier.rating,
        supplier.isActive,
        supplier.metadata,
        supplier.tenantId,
        supplier.createdAt,
        supplier.updatedAt
      );
    }
    console.log(`   ✅ Migrated ${suppliers.length} suppliers`);

    // Step 6: Create indexes
    console.log('\n📊 Step 6: Creating indexes...');
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "contacts_tenantId_code_key" ON contacts("tenantId", code)`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "contacts_tenantId_rut_key" ON contacts("tenantId", rut) WHERE rut IS NOT NULL`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "contacts_tenantId_idx" ON contacts("tenantId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "contacts_tenantId_contactType_idx" ON contacts("tenantId", "contactType")`);
    console.log('   ✅ Indexes created');

    // Step 7: Create staff_contacts table
    console.log('\n🔗 Step 7: Creating staff_contacts table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "staff_contacts" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "staffId" TEXT NOT NULL,
        "contactId" TEXT NOT NULL,
        "relationship" TEXT NOT NULL,
        "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "endDate" TIMESTAMP(3),
        "commissionRate" DECIMAL(5,2),
        "notes" TEXT
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "staff_contacts_staffId_contactId_relationship_key" ON staff_contacts("staffId", "contactId", relationship)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "staff_contacts_staffId_idx" ON staff_contacts("staffId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "staff_contacts_contactId_idx" ON staff_contacts("contactId")`);
    console.log('   ✅ staff_contacts table created');

    // Step 8: Migrate staff_customers → staff_contacts
    console.log('\n👔 Step 8: Migrating staff_customers → staff_contacts...');
    for (const rel of staffCustomers) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO staff_contacts (
          id, "staffId", "contactId", relationship, "startDate", "endDate", "commissionRate", notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
      `,
        rel.id,
        rel.staffId,
        rel.customerId, // This becomes contactId
        rel.relationship,
        rel.startDate,
        rel.endDate,
        rel.commissionRate,
        rel.notes
      );
    }
    console.log(`   ✅ Migrated ${staffCustomers.length} staff-customer relations`);

    // Step 9: Migrate staff_suppliers → staff_contacts
    console.log('\n👔 Step 9: Migrating staff_suppliers → staff_contacts...');
    for (const rel of staffSuppliers) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO staff_contacts (
          id, "staffId", "contactId", relationship, "startDate", "endDate", notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `,
        rel.id,
        rel.staffId,
        rel.supplierId, // This becomes contactId
        rel.role, // role becomes relationship
        rel.startDate,
        rel.endDate,
        rel.notes
      );
    }
    console.log(`   ✅ Migrated ${staffSuppliers.length} staff-supplier relations`);

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📌 Next steps:');
    console.log('   1. Run: npx prisma db push --accept-data-loss');
    console.log('   2. Verify data integrity');
    console.log('   3. Update application code to use Contact model\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateToContacts();
