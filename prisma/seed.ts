import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo',
      rut: '76123456-7',
      address: 'Av. Providencia 1234, Santiago',
      phone: '+56 2 2345 6789',
      email: 'admin@demo.com',
      settings: {
        currency: 'CLP',
        timezone: 'America/Santiago',
        taxRate: 19,
        businessHours: {
          monday: { open: '09:00', close: '18:00' },
          tuesday: { open: '09:00', close: '18:00' },
          wednesday: { open: '09:00', close: '18:00' },
          thursday: { open: '09:00', close: '18:00' },
          friday: { open: '09:00', close: '18:00' },
          saturday: { open: '10:00', close: '14:00' },
          sunday: null
        }
      },
      features: ['pos', 'inventory', 'customers', 'suppliers', 'reports', 'tax_documents'],
    },
  });

  // Create admin user
  const hashedPassword = await bcrypt.hash('Demo1234', 10);
  const adminUser = await prisma.staff.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      department: 'Management',
      position: 'System Administrator',
      phone: '+56 9 8765 4321',
      tenantId: tenant.id,
    },
  });

  // Create sample employee
  const employeePassword = await bcrypt.hash('Employee123', 10);
  const employee = await prisma.staff.upsert({
    where: { email: 'employee@demo.com' },
    update: {},
    create: {
      email: 'employee@demo.com',
      password: employeePassword,
      firstName: 'Juan',
      lastName: 'Pérez',
      role: 'EMPLOYEE',
      department: 'Sales',
      position: 'Sales Associate',
      phone: '+56 9 1234 5678',
      tenantId: tenant.id,
    },
  });

  // Create sample contacts - Suppliers
  const supplier1 = await prisma.contact.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'SUP001' } },
    update: {},
    create: {
      code: 'SUP001',
      name: 'Distribuidora Central',
      contactType: 'SUPPLIER',
      rut: '96123456-7',
      contactName: 'María González',
      email: 'contacto@distribuidora.cl',
      phone: '+56 2 2987 6543',
      address: 'Av. Industrial 5678, Santiago',
      city: 'Santiago',
      country: 'Chile',
      paymentTerms: '30_days',
      rating: 4,
      tenantId: tenant.id,
    },
  });

  const supplier2 = await prisma.contact.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'SUP002' } },
    update: {},
    create: {
      code: 'SUP002',
      name: 'Proveedor Local',
      contactType: 'SUPPLIER',
      rut: '78987654-3',
      contactName: 'Carlos Ruiz',
      email: 'ventas@proveedorlocal.cl',
      phone: '+56 2 2345 6789',
      address: 'Calle Comercial 123, Valparaíso',
      city: 'Valparaíso',
      country: 'Chile',
      paymentTerms: '15_days',
      rating: 5,
      tenantId: tenant.id,
    },
  });

  // Create sample contacts - Customers
  const customer1 = await prisma.contact.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'CLI001' } },
    update: {},
    create: {
      code: 'CLI001',
      name: 'Restaurant El Buen Sabor',
      contactType: 'CUSTOMER',
      rut: '76555666-7',
      email: 'gerencia@elbuensabor.cl',
      phone: '+56 2 2111 2222',
      address: 'Av. Las Condes 987, Santiago',
      city: 'Santiago',
      country: 'Chile',
      creditLimit: 500000,
      currentDebt: 0,
      tenantId: tenant.id,
    },
  });

  const customer2 = await prisma.contact.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'CLI002' } },
    update: {},
    create: {
      code: 'CLI002',
      name: 'Ana Sofía Martínez',
      contactType: 'CUSTOMER',
      rut: '12345678-9',
      email: 'ana.martinez@email.com',
      phone: '+56 9 8888 7777',
      address: 'Pasaje Los Aromos 456, Providencia',
      city: 'Santiago',
      country: 'Chile',
      creditLimit: 100000,
      currentDebt: 0,
      tenantId: tenant.id,
    },
  });

  // Create sample products
  const products = [
    {
      sku: 'PRD001',
      name: 'Café Premium 1kg',
      description: 'Café de grano selecto, tostado medio',
      category: 'Bebidas',
      brand: 'Café del Valle',
      unitPrice: 8500,
      costPrice: 5500,
      currentStock: 25,
      minStock: 5,
      unit: 'KILOGRAM',
    },
    {
      sku: 'PRD002',
      name: 'Azúcar Blanca 1kg',
      description: 'Azúcar refinada para uso general',
      category: 'Endulzantes',
      brand: 'Azúcar Real',
      unitPrice: 1200,
      costPrice: 800,
      currentStock: 50,
      minStock: 10,
      unit: 'KILOGRAM',
    },
    {
      sku: 'PRD003',
      name: 'Leche Entera 1L',
      description: 'Leche fresca pasteurizada',
      category: 'Lácteos',
      brand: 'Lácteos del Sur',
      unitPrice: 950,
      costPrice: 650,
      currentStock: 30,
      minStock: 8,
      unit: 'LITER',
    },
    {
      sku: 'PRD004',
      name: 'Pan Integral 500g',
      description: 'Pan integral artesanal',
      category: 'Panadería',
      brand: 'Panadería Artesana',
      unitPrice: 2500,
      costPrice: 1500,
      currentStock: 15,
      minStock: 3,
      unit: 'UNIT',
    },
    {
      sku: 'PRD005',
      name: 'Mermelada Frutilla 250g',
      description: 'Mermelada casera de frutilla',
      category: 'Conservas',
      brand: 'Delicias Caseras',
      unitPrice: 3200,
      costPrice: 2000,
      currentStock: 20,
      minStock: 5,
      unit: 'UNIT',
    },
  ];

  for (const productData of products) {
    await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: productData.sku } },
      update: {},
      create: {
        ...productData,
        tenantId: tenant.id,
      },
    });
  }

  // Link products to suppliers (contacts)
  const allProducts = await prisma.product.findMany({ where: { tenantId: tenant.id } });

  // Link some products to supplier 1
  for (const product of allProducts.slice(0, 3)) {
    await prisma.productSupplier.upsert({
      where: { productId_supplierId: { productId: product.id, supplierId: supplier1.id } },
      update: {},
      create: {
        productId: product.id,
        supplierId: supplier1.id,
        supplierSKU: `SUP1-${product.sku}`,
        supplierPrice: product.costPrice || 0,
        leadTimeDays: 7,
        minOrderQty: 10,
        isPreferred: true,
      },
    });
  }

  // Link remaining products to supplier 2
  for (const product of allProducts.slice(3)) {
    await prisma.productSupplier.upsert({
      where: { productId_supplierId: { productId: product.id, supplierId: supplier2.id } },
      update: {},
      create: {
        productId: product.id,
        supplierId: supplier2.id,
        supplierSKU: `SUP2-${product.sku}`,
        supplierPrice: product.costPrice || 0,
        leadTimeDays: 3,
        minOrderQty: 5,
        isPreferred: true,
      },
    });
  }

  // Assign staff to manage contacts
  await prisma.staffContact.upsert({
    where: {
      staffId_contactId_relationship: {
        staffId: adminUser.id,
        contactId: supplier1.id,
        relationship: 'ACCOUNT_MANAGER'
      }
    },
    update: {},
    create: {
      staffId: adminUser.id,
      contactId: supplier1.id,
      relationship: 'ACCOUNT_MANAGER',
      commissionRate: 0,
      notes: 'Primary contact for all orders'
    },
  });

  await prisma.staffContact.upsert({
    where: {
      staffId_contactId_relationship: {
        staffId: employee.id,
        contactId: supplier2.id,
        relationship: 'BUYER'
      }
    },
    update: {},
    create: {
      staffId: employee.id,
      contactId: supplier2.id,
      relationship: 'BUYER',
      commissionRate: 0,
      notes: 'Handles local purchases'
    },
  });

  // Assign staff to customers
  await prisma.staffContact.upsert({
    where: {
      staffId_contactId_relationship: {
        staffId: employee.id,
        contactId: customer1.id,
        relationship: 'ACCOUNT_MANAGER'
      }
    },
    update: {},
    create: {
      staffId: employee.id,
      contactId: customer1.id,
      relationship: 'ACCOUNT_MANAGER',
      commissionRate: 3.5,
      notes: 'VIP customer - restaurant'
    },
  });

  // Create default contact type configurations
  const contactTypeConfigs = [
    {
      name: 'CUSTOMER',
      label: 'Customer',
      description: 'Regular customers who purchase products',
      icon: '👤',
      color: 'bg-blue-100 text-blue-800',
      isSystem: true,
      order: 1,
      fields: [
        { fieldName: 'code', fieldLabel: 'Code', fieldType: 'text', isRequired: true, isVisible: true, order: 1, placeholder: 'CLI001' },
        { fieldName: 'name', fieldLabel: 'Name', fieldType: 'text', isRequired: true, isVisible: true, order: 2, placeholder: 'Company or Person Name' },
        { fieldName: 'rut', fieldLabel: 'RUT', fieldType: 'text', isRequired: false, isVisible: true, order: 3, placeholder: '12345678-9' },
        { fieldName: 'email', fieldLabel: 'Email', fieldType: 'email', isRequired: false, isVisible: true, order: 4 },
        { fieldName: 'phone', fieldLabel: 'Phone', fieldType: 'phone', isRequired: false, isVisible: true, order: 5 },
        { fieldName: 'address', fieldLabel: 'Address', fieldType: 'text', isRequired: false, isVisible: true, order: 6 },
        { fieldName: 'city', fieldLabel: 'City', fieldType: 'text', isRequired: false, isVisible: true, order: 7 },
        { fieldName: 'creditLimit', fieldLabel: 'Credit Limit', fieldType: 'number', isRequired: false, isVisible: true, order: 8 },
      ],
    },
    {
      name: 'SUPPLIER',
      label: 'Supplier',
      description: 'Vendors and suppliers',
      icon: '🏭',
      color: 'bg-green-100 text-green-800',
      isSystem: true,
      order: 2,
      fields: [
        { fieldName: 'code', fieldLabel: 'Code', fieldType: 'text', isRequired: true, isVisible: true, order: 1, placeholder: 'SUP001' },
        { fieldName: 'name', fieldLabel: 'Name', fieldType: 'text', isRequired: true, isVisible: true, order: 2 },
        { fieldName: 'rut', fieldLabel: 'RUT', fieldType: 'text', isRequired: false, isVisible: true, order: 3 },
        { fieldName: 'contactName', fieldLabel: 'Contact Person', fieldType: 'text', isRequired: false, isVisible: true, order: 4 },
        { fieldName: 'email', fieldLabel: 'Email', fieldType: 'email', isRequired: false, isVisible: true, order: 5 },
        { fieldName: 'phone', fieldLabel: 'Phone', fieldType: 'phone', isRequired: false, isVisible: true, order: 6 },
        { fieldName: 'address', fieldLabel: 'Address', fieldType: 'text', isRequired: false, isVisible: true, order: 7 },
        { fieldName: 'paymentTerms', fieldLabel: 'Payment Terms', fieldType: 'select', isRequired: false, isVisible: true, order: 8, options: JSON.stringify(['cash', '15_days', '30_days', '60_days', '90_days']) },
      ],
    },
    {
      name: 'BRAND',
      label: 'Brand',
      description: 'Product brands and manufacturers',
      icon: '🏷️',
      color: 'bg-purple-100 text-purple-800',
      isSystem: true,
      order: 3,
      fields: [
        { fieldName: 'code', fieldLabel: 'Code', fieldType: 'text', isRequired: true, isVisible: true, order: 1 },
        { fieldName: 'name', fieldLabel: 'Brand Name', fieldType: 'text', isRequired: true, isVisible: true, order: 2 },
        { fieldName: 'contactName', fieldLabel: 'Contact Person', fieldType: 'text', isRequired: false, isVisible: true, order: 3 },
        { fieldName: 'email', fieldLabel: 'Email', fieldType: 'email', isRequired: false, isVisible: true, order: 4 },
        { fieldName: 'phone', fieldLabel: 'Phone', fieldType: 'phone', isRequired: false, isVisible: true, order: 5 },
      ],
    },
  ];

  for (const config of contactTypeConfigs) {
    await prisma.contactTypeConfig.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: config.name } },
      update: {},
      create: {
        ...config,
        tenantId: tenant.id,
        fields: {
          create: config.fields.map(field => ({
            ...field,
            tenantId: tenant.id,
          })),
        },
      },
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log('🏢 Tenant:', tenant.name);
  console.log('👤 Admin user: admin@demo.com / Demo1234');
  console.log('👤 Employee: employee@demo.com / Employee123');
  console.log('📦 Created', products.length, 'sample products');
  console.log('📇 Created 2 supplier contacts');
  console.log('📇 Created 2 customer contacts');
  console.log('⚙️  Created', contactTypeConfigs.length, 'contact type configurations');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });