import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator with full permissions',
      permissions: [
        'projects.manage',
        'tasks.manage',
        'knowledge.manage',
        'inventory.manage',
        'finance.manage',
        'users.manage',
      ],
    },
  });

  await prisma.user.upsert({
    where: { email: 'contacto@murallacafe.cl' },
    update: {},
    create: {
      email: 'contacto@murallacafe.cl',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      password: passwordHash,
      role: {
        connect: { id: adminRole.id },
      },
    },
  });

  console.log('Seed completed ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
