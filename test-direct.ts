/**
 * Direct database test - bypass API to test new models
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDirectly() {
  try {
    console.log('🧪 Direct Database Testing...\n');

    // Get a tenant and staff member
    const tenant = await prisma.tenant.findFirst();
    const staff = await prisma.staff.findFirst({ where: { tenantId: tenant?.id } });

    if (!tenant || !staff) {
      console.error('❌ No tenant or staff found');
      return;
    }

    console.log('✅ Found tenant:', tenant.name);
    console.log('✅ Found staff:', staff.firstName, staff.lastName);

    // Create a project
    console.log('\n📁 Creating project...');
    const project = await prisma.project.create({
      data: {
        name: 'Test Project - Direct DB',
        description: 'Testing project creation directly in database',
        color: '#10B981',
        tenantId: tenant.id,
        createdById: staff.id,
      },
    });

    console.log('✅ Project created:', project.name);
    console.log('   ID:', project.id);
    console.log('   Color:', project.color);

    // Create a task with new fields
    console.log('\n📝 Creating task with new fields...');
    const task = await prisma.task.create({
      data: {
        title: 'Test Task - With New Fields',
        description: 'Testing new task fields',
        priority: 'HIGH',
        projectId: project.id,
        startDate: new Date('2025-01-01'),
        dueDate: new Date('2025-01-15'),
        progress: 30,
        estimatedHours: 20,
        tenantId: tenant.id,
        createdById: staff.id,
      },
    });

    console.log('✅ Task created:', task.title);
    console.log('   ID:', task.id);
    console.log('   Project ID:', task.projectId);
    console.log('   Progress:', task.progress + '%');
    console.log('   Estimated Hours:', task.estimatedHours);
    console.log('   Start Date:', task.startDate?.toISOString().split('T')[0]);
    console.log('   Due Date:', task.dueDate?.toISOString().split('T')[0]);

    // Create a subtask
    console.log('\n📋 Creating subtask...');
    const subtask = await prisma.task.create({
      data: {
        title: 'Subtask - Research Phase',
        description: 'Initial research for the project',
        priority: 'MEDIUM',
        projectId: project.id,
        parentTaskId: task.id,
        startDate: new Date('2025-01-01'),
        dueDate: new Date('2025-01-05'),
        progress: 50,
        estimatedHours: 8,
        tenantId: tenant.id,
        createdById: staff.id,
      },
    });

    console.log('✅ Subtask created:', subtask.title);
    console.log('   Parent Task ID:', subtask.parentTaskId);
    console.log('   Progress:', subtask.progress + '%');

    // Fetch project with tasks
    console.log('\n📊 Fetching project with tasks...');
    const projectWithTasks = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        tasks: {
          include: {
            subtasks: true,
            parentTask: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    console.log('✅ Project details:');
    console.log('   Name:', projectWithTasks?.name);
    console.log('   Total Tasks:', projectWithTasks?._count.tasks);
    console.log('   Task List:');
    projectWithTasks?.tasks.forEach(t => {
      const prefix = t.parentTaskId ? '     ↳ ' : '   - ';
      console.log(`${prefix}${t.title} (${t.progress}%)`);
    });

    // Create a dependency
    console.log('\n🔗 Creating task dependency...');
    const task2 = await prisma.task.create({
      data: {
        title: 'Development Phase',
        description: 'Development work',
        priority: 'HIGH',
        projectId: project.id,
        startDate: new Date('2025-01-16'),
        dueDate: new Date('2025-01-31'),
        progress: 0,
        estimatedHours: 40,
        tenantId: tenant.id,
        createdById: staff.id,
      },
    });

    const dependency = await prisma.taskDependency.create({
      data: {
        taskId: task2.id,
        dependsOnTaskId: task.id,
        dependencyType: 'FINISH_TO_START',
      },
    });

    console.log('✅ Dependency created:', dependency.id);
    console.log('   Task:', task2.title);
    console.log('   Depends on:', task.title);
    console.log('   Type:', dependency.dependencyType);

    // Fetch task with dependencies
    const taskWithDeps = await prisma.task.findUnique({
      where: { id: task2.id },
      include: {
        dependencies: {
          include: {
            dependsOnTask: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
    });

    console.log('\n✅ Task with dependencies:');
    console.log('   Task:', taskWithDeps?.title);
    console.log('   Dependencies:');
    taskWithDeps?.dependencies.forEach(d => {
      console.log(`   - ${d.dependsOnTask.title} (${d.dependsOnTask.status}) [${d.dependencyType}]`);
    });

    console.log('\n✅✅✅ All direct database tests passed! 🎉');
    console.log('\n📊 Summary:');
    console.log('   ✓ Project model working');
    console.log('   ✓ Task with new fields working');
    console.log('   ✓ Subtask (hierarchical) working');
    console.log('   ✓ Task dependencies working');
    console.log('   ✓ All relationships working correctly');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectly();
