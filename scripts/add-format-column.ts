/**
 * Script to add missing 'format' column to products table
 * Run this with: npx tsx scripts/add-format-column.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addFormatColumn() {
  try {
    console.log('Adding format column to products table...');

    // Create ProductFormat enum if it doesn't exist
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "ProductFormat" AS ENUM ('PACKAGED', 'FROZEN', 'FRESH');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('✓ ProductFormat enum created/verified');

    // Add format column to products table if it doesn't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS format "ProductFormat";
    `);

    console.log('✓ format column added to products table');

    // Also add format column to categories table if it doesn't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS format "ProductFormat";
    `);

    console.log('✓ format column added to categories table');

    // Add format column to expense_categories table if it doesn't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE expense_categories
      ADD COLUMN IF NOT EXISTS format "ProductFormat";
    `);

    console.log('✓ format column added to expense_categories table');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addFormatColumn();
