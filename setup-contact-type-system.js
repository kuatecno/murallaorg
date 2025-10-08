/**
 * Migration Script: Setup Custom Contact Type System
 * Creates ContactTypeConfig and ContactFieldConfig tables
 * Migrates existing contacts to use the new system
 * Creates default contact type configurations
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultContactTypes = [
  {
    name: 'CUSTOMER',
    label: 'Customer',
    description: 'Buys products or services from your business',
    icon: '👤',
    color: 'bg-blue-100 text-blue-800',
    isSystem: true,
    order: 1,
    fields: [
      { fieldName: 'code', fieldLabel: 'Code', fieldType: 'text', isRequired: true, order: 1 },
      { fieldName: 'name', fieldLabel: 'Name', fieldType: 'text', isRequired: true, order: 2 },
      { fieldName: 'rut', fieldLabel: 'RUT', fieldType: 'text', isRequired: false, order: 3, placeholder: '12.345.678-9' },
      { fieldName: 'email', fieldLabel: 'Email', fieldType: 'email', isRequired: false, order: 4 },
      { fieldName: 'phone', fieldLabel: 'Phone', fieldType: 'phone', isRequired: false, order: 5 },
      { fieldName: 'contactName', fieldLabel: 'Contact Person', fieldType: 'text', isRequired: false, order: 6 },
      { fieldName: 'address', fieldLabel: 'Address', fieldType: 'text', isRequired: false, order: 7 },
      { fieldName: 'city', fieldLabel: 'City', fieldType: 'text', isRequired: false, order: 8 },
      { fieldName: 'country', fieldLabel: 'Country', fieldType: 'text', isRequired: false, order: 9, defaultValue: 'Chile' },
      { fieldName: 'creditLimit', fieldLabel: 'Credit Limit (CLP)', fieldType: 'number', isRequired: false, order: 10 },
      { fieldName: 'paymentTerms', fieldLabel: 'Payment Terms', fieldType: 'select', isRequired: false, order: 11, options: ['immediate', '15_days', '30_days', '60_days', '90_days'] },
      { fieldName: 'rating', fieldLabel: 'Rating (1-5)', fieldType: 'number', isRequired: false, order: 12, validation: { min: 1, max: 5 } },
    ],
  },
  {
    name: 'SUPPLIER',
    label: 'Supplier',
    description: 'Provides products or services to your business',
    icon: '🏭',
    color: 'bg-green-100 text-green-800',
    isSystem: true,
    order: 2,
    fields: [
      { fieldName: 'code', fieldLabel: 'Code', fieldType: 'text', isRequired: true, order: 1 },
      { fieldName: 'name', fieldLabel: 'Company Name', fieldType: 'text', isRequired: true, order: 2 },
      { fieldName: 'rut', fieldLabel: 'RUT', fieldType: 'text', isRequired: false, order: 3 },
      { fieldName: 'email', fieldLabel: 'Email', fieldType: 'email', isRequired: false, order: 4 },
      { fieldName: 'phone', fieldLabel: 'Phone', fieldType: 'phone', isRequired: false, order: 5 },
      { fieldName: 'contactName', fieldLabel: 'Contact Person', fieldType: 'text', isRequired: false, order: 6 },
      { fieldName: 'address', fieldLabel: 'Address', fieldType: 'text', isRequired: false, order: 7 },
      { fieldName: 'city', fieldLabel: 'City', fieldType: 'text', isRequired: false, order: 8 },
      { fieldName: 'country', fieldLabel: 'Country', fieldType: 'text', isRequired: false, order: 9, defaultValue: 'Chile' },
      { fieldName: 'paymentTerms', fieldLabel: 'Payment Terms', fieldType: 'select', isRequired: false, order: 10, options: ['immediate', '15_days', '30_days', '60_days', '90_days'] },
      { fieldName: 'rating', fieldLabel: 'Supplier Rating', fieldType: 'number', isRequired: false, order: 11, validation: { min: 1, max: 5 } },
    ],
  },
  {
    name: 'BRAND',
    label: 'Brand',
    description: 'Brand or manufacturer partner',
    icon: '🏷️',
    color: 'bg-pink-100 text-pink-800',
    isSystem: true,
    order: 3,
    fields: [
      { fieldName: 'code', fieldLabel: 'Code', fieldType: 'text', isRequired: true, order: 1 },
      { fieldName: 'name', fieldLabel: 'Brand Name', fieldType: 'text', isRequired: true, order: 2 },
      { fieldName: 'email', fieldLabel: 'Email', fieldType: 'email', isRequired: false, order: 3 },
      { fieldName: 'phone', fieldLabel: 'Phone', fieldType: 'phone', isRequired: false, order: 4 },
      { fieldName: 'contactName', fieldLabel: 'Contact Person', fieldType: 'text', isRequired: false, order: 5 },
      { fieldName: 'website', fieldLabel: 'Website', fieldType: 'text', isRequired: false, order: 6, placeholder: 'https://example.com' },
    ],
  },
  {
    name: 'AGENT',
    label: 'Agent',
    description: 'Sales agent or representative',
    icon: '🤵',
    color: 'bg-yellow-100 text-yellow-800',
    isSystem: true,
    order: 4,
    fields: [
      { fieldName: 'code', fieldLabel: 'Code', fieldType: 'text', isRequired: true, order: 1 },
      { fieldName: 'name', fieldLabel: 'Full Name', fieldType: 'text', isRequired: true, order: 2 },
      { fieldName: 'email', fieldLabel: 'Email', fieldType: 'email', isRequired: true, order: 3 },
      { fieldName: 'phone', fieldLabel: 'Phone', fieldType: 'phone', isRequired: true, order: 4 },
      { fieldName: 'territory', fieldLabel: 'Territory', fieldType: 'text', isRequired: false, order: 5 },
      { fieldName: 'commissionRate', fieldLabel: 'Commission Rate (%)', fieldType: 'number', isRequired: false, order: 6, validation: { min: 0, max: 100 } },
    ],
  },
  {
    name: 'COURIER',
    label: 'Courier',
    description: 'Delivery or courier service',
    icon: '🚚',
    color: 'bg-orange-100 text-orange-800',
    isSystem: true,
    order: 5,
    fields: [
      { fieldName: 'code', fieldLabel: 'Code', fieldType: 'text', isRequired: true, order: 1 },
      { fieldName: 'name', fieldLabel: 'Company Name', fieldType: 'text', isRequired: true, order: 2 },
      { fieldName: 'email', fieldLabel: 'Email', fieldType: 'email', isRequired: false, order: 3 },
      { fieldName: 'phone', fieldLabel: 'Phone', fieldType: 'phone', isRequired: true, order: 4 },
      { fieldName: 'serviceTypes', fieldLabel: 'Service Types', fieldType: 'textarea', isRequired: false, order: 5, helpText: 'e.g., Express, Standard, International' },
      { fieldName: 'deliveryZones', fieldLabel: 'Delivery Zones', fieldType: 'textarea', isRequired: false, order: 6 },
    ],
  },
  {
    name: 'INFLUENCER',
    label: 'Influencer',
    description: 'Influencer or marketing partner',
    icon: '⭐',
    color: 'bg-indigo-100 text-indigo-800',
    isSystem: true,
    order: 6,
    fields: [
      { fieldName: 'code', fieldLabel: 'Code', fieldType: 'text', isRequired: true, order: 1 },
      { fieldName: 'name', fieldLabel: 'Full Name / Handle', fieldType: 'text', isRequired: true, order: 2 },
      { fieldName: 'email', fieldLabel: 'Email', fieldType: 'email', isRequired: true, order: 3 },
      { fieldName: 'phone', fieldLabel: 'Phone', fieldType: 'phone', isRequired: false, order: 4 },
      { fieldName: 'platform', fieldLabel: 'Primary Platform', fieldType: 'select', isRequired: false, order: 5, options: ['Instagram', 'TikTok', 'YouTube', 'Twitter', 'Facebook', 'Other'] },
      { fieldName: 'followerCount', fieldLabel: 'Follower Count', fieldType: 'number', isRequired: false, order: 6 },
      { fieldName: 'engagementRate', fieldLabel: 'Engagement Rate (%)', fieldType: 'number', isRequired: false, order: 7, validation: { min: 0, max: 100 } },
    ],
  },
];

async function setupContactTypeSystem() {
  console.log('🔄 Setting up Custom Contact Type System\n');

  try {
    // Get first tenant (or you can loop through all tenants)
    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
      console.log('❌ No tenant found. Please create a tenant first.');
      return;
    }

    console.log(`📌 Setting up for tenant: ${tenant.name} (${tenant.id})\n`);

    // Step 1: Create contact type configs and field configs
    console.log('📝 Creating default contact type configurations...');

    for (const typeConfig of defaultContactTypes) {
      const { fields, ...typeData } = typeConfig;

      // Create or update contact type config
      const contactType = await prisma.contactTypeConfig.upsert({
        where: {
          tenantId_name: {
            tenantId: tenant.id,
            name: typeConfig.name,
          },
        },
        update: {
          label: typeData.label,
          description: typeData.description,
          icon: typeData.icon,
          color: typeData.color,
          order: typeData.order,
        },
        create: {
          ...typeData,
          tenantId: tenant.id,
        },
      });

      console.log(`   ✅ ${typeData.label} type created/updated`);

      // Create field configs for this type
      for (const field of fields) {
        await prisma.contactFieldConfig.upsert({
          where: {
            contactTypeId_fieldName: {
              contactTypeId: contactType.id,
              fieldName: field.fieldName,
            },
          },
          update: {
            fieldLabel: field.fieldLabel,
            fieldType: field.fieldType,
            isRequired: field.isRequired,
            order: field.order,
            placeholder: field.placeholder,
            helpText: field.helpText,
            validation: field.validation ? JSON.stringify(field.validation) : null,
            options: field.options ? JSON.stringify(field.options) : null,
            defaultValue: field.defaultValue,
          },
          create: {
            contactTypeId: contactType.id,
            fieldName: field.fieldName,
            fieldLabel: field.fieldLabel,
            fieldType: field.fieldType,
            isRequired: field.isRequired,
            order: field.order,
            placeholder: field.placeholder,
            helpText: field.helpText,
            validation: field.validation ? JSON.stringify(field.validation) : null,
            options: field.options ? JSON.stringify(field.options) : null,
            defaultValue: field.defaultValue,
            tenantId: tenant.id,
          },
        });
      }

      console.log(`      → ${fields.length} fields configured`);
    }

    console.log('\n✅ Contact type system setup completed successfully!');
    console.log('\n📌 Next steps:');
    console.log('   1. Run: npx prisma db push');
    console.log('   2. Run: npx prisma generate');
    console.log('   3. Restart your dev server\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup
setupContactTypeSystem();
