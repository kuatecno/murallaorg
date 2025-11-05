/**
 * Generate API Key Script
 * Run this to generate a new API key for your tenant
 *
 * Usage: npx tsx scripts/generate-api-key.ts
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateApiKey(isLive = true): string {
  const prefix = isLive ? 'muralla_live_' : 'muralla_test_';
  const randomPart = crypto.randomBytes(24).toString('hex');
  return `${prefix}${randomPart}`;
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function main() {
  console.log('🔑 Muralla API Key Generator\n');

  // Get all active tenants
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true }
  });

  if (tenants.length === 0) {
    console.error('❌ No active tenants found!');
    process.exit(1);
  }

  console.log('Available tenants:');
  tenants.forEach((tenant, index) => {
    console.log(`  ${index + 1}. ${tenant.name} (${tenant.slug})`);
  });

  // Use first tenant for simplicity
  const tenant = tenants[0];
  console.log(`\n📍 Generating API key for: ${tenant.name}\n`);

  // Generate the key
  const apiKey = generateApiKey(true);
  const hashedKey = hashApiKey(apiKey);

  // Create the API key in database
  const keyRecord = await prisma.apiKey.create({
    data: {
      name: 'Auto-generated API Key',
      key: hashedKey,
      tenantId: tenant.id,
      expiresAt: null, // No expiration
    }
  });

  console.log('✅ API Key created successfully!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔐 YOUR API KEY (Save this - it will not be shown again!)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n${apiKey}\n`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n📋 Key Details:');
  console.log(`   ID: ${keyRecord.id}`);
  console.log(`   Name: ${keyRecord.name}`);
  console.log(`   Tenant: ${tenant.name}`);
  console.log(`   Created: ${keyRecord.createdAt}`);
  console.log(`   Expires: Never`);
  console.log('\n💡 Usage Example:');
  console.log('```bash');
  console.log(`curl https://admin.murallacafe.cl/api/products \\`);
  console.log(`  -H "Authorization: Bearer ${apiKey}"`);
  console.log('```\n');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
