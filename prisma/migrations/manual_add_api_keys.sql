-- Manual Migration: Add API Keys table
-- Run this directly in your Supabase SQL editor if automated migrations fail

-- Create api_keys table
CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL UNIQUE,
    "tenantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_tenantId_fkey" FOREIGN KEY ("tenantId")
        REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "api_keys_tenantId_idx" ON "api_keys"("tenantId");
CREATE INDEX IF NOT EXISTS "api_keys_key_isActive_idx" ON "api_keys"("key", "isActive");

-- Verify the table was created
SELECT 'API Keys table created successfully!' as status;
SELECT COUNT(*) as table_count FROM information_schema.tables
WHERE table_name = 'api_keys' AND table_schema = 'public';
