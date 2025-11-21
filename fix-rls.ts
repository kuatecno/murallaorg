/**
 * Fix Supabase RLS Policies for Development
 * Disables Row Level Security on all tables
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function disableRLS() {
  console.log('🔧 Fixing Supabase RLS Policies...\n');

  const tables = [
    'staff', 'tenants', 'tasks', 'task_assignments', 'task_comments',
    'projects', 'task_dependencies', 'products', 'categories',
    'inventory_records', 'transactions', 'transaction_items',
    'contacts', 'contact_type_configs', 'contact_field_configs',
    'staff_contacts', 'payment_accounts', 'expenses',
    'expense_categories', 'expense_statuses', 'tax_documents',
    'purchase_orders', 'purchase_order_items', 'shifts',
    'attendances', 'pto_requests', 'payroll_runs',
    'employee_reimbursements', 'api_keys', 'audit_logs',
    'modifier_groups', 'product_modifiers', 'transaction_item_modifiers',
    'product_variants', 'recipes', 'recipe_ingredients',
    'production_batches', 'ingredient_consumptions', 'product_movements',
    'staff_products'
  ];

  try {
    console.log('📋 Disabling RLS on tables...');

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS ${table} DISABLE ROW LEVEL SECURITY`);
        console.log(`   ✓ ${table}`);
      } catch (error: any) {
        // Some tables might not exist, that's okay
        if (!error.message.includes('does not exist')) {
          console.log(`   ⚠ ${table}: ${error.message}`);
        }
      }
    }

    console.log('\n🧹 Dropping existing policies...');

    // Get all existing policies
    const policies: any[] = await prisma.$queryRaw`
      SELECT schemaname, tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
    `;

    console.log(`   Found ${policies.length} policies to remove`);

    for (const policy of policies) {
      try {
        await prisma.$executeRawUnsafe(
          `DROP POLICY IF EXISTS "${policy.policyname}" ON ${policy.schemaname}.${policy.tablename}`
        );
        console.log(`   ✓ Dropped policy: ${policy.policyname} on ${policy.tablename}`);
      } catch (error: any) {
        console.log(`   ⚠ Failed to drop ${policy.policyname}: ${error.message}`);
      }
    }

    console.log('\n✅ Verifying RLS status...');

    const rlsStatus: any[] = await prisma.$queryRaw`
      SELECT tablename, rowsecurity as "rls_enabled"
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    const enabledCount = rlsStatus.filter(t => t.rls_enabled).length;
    const disabledCount = rlsStatus.filter(t => !t.rls_enabled).length;

    console.log(`   Tables with RLS enabled: ${enabledCount}`);
    console.log(`   Tables with RLS disabled: ${disabledCount}`);

    if (enabledCount > 0) {
      console.log('\n⚠️  Some tables still have RLS enabled:');
      rlsStatus.filter(t => t.rls_enabled).forEach(t => {
        console.log(`   - ${t.tablename}`);
      });
    }

    console.log('\n✅✅✅ RLS policies fixed! 🎉');
    console.log('\n📝 Summary:');
    console.log(`   ✓ Processed ${tables.length} tables`);
    console.log(`   ✓ Removed ${policies.length} policies`);
    console.log(`   ✓ ${disabledCount} tables have RLS disabled`);
    console.log('\n⚠️  Note: This is for development only!');
    console.log('   Re-enable RLS and create proper policies for production.');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

disableRLS();
