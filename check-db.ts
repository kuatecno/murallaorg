import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('Checking database...\n');

    // Check tenants
    const tenants = await prisma.tenant.findMany();
    console.log(`📊 Tenants: ${tenants.length}`);
    tenants.forEach(t => console.log(`   - ${t.name} (${t.slug})`));

    // Check staff
    const staff = await prisma.staff.findMany();
    console.log(`\n👥 Staff: ${staff.length}`);
    staff.forEach(s => console.log(`   - ${s.firstName} ${s.lastName} (${s.email})`));

    // Check projects
    const projects = await prisma.project.findMany();
    console.log(`\n📁 Projects: ${projects.length}`);
    projects.forEach(p => console.log(`   - ${p.name}`));

    // Check tasks
    const tasks = await prisma.task.findMany();
    console.log(`\n📝 Tasks: ${tasks.length}`);
    tasks.forEach(t => console.log(`   - ${t.title}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
