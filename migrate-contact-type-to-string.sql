-- Migration: Convert contactType from enum to String and add Contact Type Config tables
-- This migration preserves existing contact data

BEGIN;

-- Step 1: Create new Contact Type Config tables
CREATE TABLE IF NOT EXISTS "contact_type_configs" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "color" TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "tenantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "contact_type_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contact_type_configs_tenantId_name_key" UNIQUE ("tenantId", "name")
);

CREATE TABLE IF NOT EXISTS "contact_field_configs" (
  "id" TEXT NOT NULL,
  "contactTypeId" TEXT NOT NULL,
  "fieldName" TEXT NOT NULL,
  "fieldLabel" TEXT NOT NULL,
  "fieldType" TEXT NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "placeholder" TEXT,
  "helpText" TEXT,
  "validation" JSONB,
  "options" JSONB,
  "defaultValue" TEXT,
  "tenantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "contact_field_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contact_field_configs_contactTypeId_fieldName_key" UNIQUE ("contactTypeId", "fieldName")
);

-- Step 2: Add indexes
CREATE INDEX IF NOT EXISTS "contact_type_configs_tenantId_isActive_idx" ON "contact_type_configs"("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "contact_field_configs_contactTypeId_isVisible_idx" ON "contact_field_configs"("contactTypeId", "isVisible");

-- Step 3: Add foreign keys (drop if exists first to avoid errors)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_type_configs_tenantId_fkey') THEN
    ALTER TABLE "contact_type_configs" ADD CONSTRAINT "contact_type_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_field_configs_contactTypeId_fkey') THEN
    ALTER TABLE "contact_field_configs" ADD CONSTRAINT "contact_field_configs_contactTypeId_fkey" FOREIGN KEY ("contactTypeId") REFERENCES "contact_type_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_field_configs_tenantId_fkey') THEN
    ALTER TABLE "contact_field_configs" ADD CONSTRAINT "contact_field_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 4: Convert contactType from enum to TEXT (varchar)
-- First, add a new column
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "contactType_new" TEXT;

-- Copy enum values to new column as text
UPDATE "contacts" SET "contactType_new" = "contactType"::TEXT;

-- Drop the old column and rename the new one
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "contactType";
ALTER TABLE "contacts" RENAME COLUMN "contactType_new" TO "contactType";

-- Make it NOT NULL (all existing records now have values)
ALTER TABLE "contacts" ALTER COLUMN "contactType" SET NOT NULL;

COMMIT;
