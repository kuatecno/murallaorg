const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTenants() {
  try {
    const tenants = await prisma.tenant.findMany();
    console.log('Existing tenants:', tenants);

    if (tenants.length === 0) {
      console.log('\nCreating default tenant...');
      const newTenant = await prisma.tenant.create({
        data: {
          name: 'Muralla Café',
          slug: 'muralla-cafe',
          rut: '77.123.456-7',
          address: 'Santiago, Chile',
          phone: '+56912345678',
          email: 'contacto@murallacafe.cl'
        }
      });
      console.log('Created tenant:', newTenant);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenants();