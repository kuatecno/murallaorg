/**
 * API Testing Script for New Project & Task Features
 */

async function testAPIs() {
  const baseURL = 'http://localhost:3000';

  console.log('🧪 Starting API Tests...\n');

  // Step 1: Login to get authentication
  console.log('1️⃣  Logging in...');
  const loginRes = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@demo.com',
      password: 'Demo1234'
    }),
  });

  if (!loginRes.ok) {
    console.error('❌ Login failed:', await loginRes.text());
    return;
  }

  const loginData = await loginRes.json();
  const cookies = loginRes.headers.get('set-cookie');
  console.log('✅ Login successful!');
  console.log('   User:', loginData.user.firstName, loginData.user.lastName);
  console.log('   Tenant:', loginData.user.tenantId);

  // Extract token from cookie
  const tokenMatch = cookies?.match(/token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : '';

  // Step 2: Create a new project
  console.log('\n2️⃣  Creating a new project...');
  const projectRes = await fetch(`${baseURL}/api/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`
    },
    body: JSON.stringify({
      name: 'Website Redesign 2025',
      description: 'Complete overhaul of company website with modern design',
      color: '#8B5CF6',
      startDate: '2025-01-01',
      endDate: '2025-03-31'
    }),
  });

  if (!projectRes.ok) {
    console.error('❌ Project creation failed:', await projectRes.text());
    return;
  }

  const projectData = await projectRes.json();
  const projectId = projectData.project.id;
  console.log('✅ Project created successfully!');
  console.log('   ID:', projectId);
  console.log('   Name:', projectData.project.name);
  console.log('   Color:', projectData.project.color);

  // Step 3: List all projects
  console.log('\n3️⃣  Fetching all projects...');
  const projectsListRes = await fetch(`${baseURL}/api/projects`, {
    headers: {
      'Cookie': `token=${token}`
    },
  });

  if (!projectsListRes.ok) {
    console.error('❌ Failed to fetch projects:', await projectsListRes.text());
    return;
  }

  const projectsListData = await projectsListRes.json();
  console.log('✅ Projects fetched successfully!');
  console.log(`   Total projects: ${projectsListData.projects.length}`);
  projectsListData.projects.forEach((p: any) => {
    console.log(`   - ${p.name} (${p.taskCount} tasks, ${p.progress}% complete)`);
  });

  // Step 4: Create a task with new fields
  console.log('\n4️⃣  Creating a task with new features...');
  const taskRes = await fetch(`${baseURL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`
    },
    body: JSON.stringify({
      title: 'Design Homepage Mockups',
      description: 'Create high-fidelity mockups for the new homepage design',
      priority: 'HIGH',
      projectId: projectId,
      startDate: '2025-01-05',
      dueDate: '2025-01-15',
      progress: 25,
      estimatedHours: 16,
      assignedStaff: []
    }),
  });

  if (!taskRes.ok) {
    console.error('❌ Task creation failed:', await taskRes.text());
    return;
  }

  const taskData = await taskRes.json();
  console.log('✅ Task created successfully!');
  console.log('   ID:', taskData.task.id);
  console.log('   Title:', taskData.task.title);
  console.log('   Project:', taskData.task.project?.name);
  console.log('   Progress:', taskData.task.progress + '%');
  console.log('   Estimated Hours:', taskData.task.estimatedHours);
  console.log('   Start Date:', taskData.task.startDate);
  console.log('   Due Date:', taskData.task.dueDate);

  // Step 5: Create a subtask
  console.log('\n5️⃣  Creating a subtask...');
  const subtaskRes = await fetch(`${baseURL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`
    },
    body: JSON.stringify({
      title: 'Research Design Trends',
      description: 'Research latest web design trends for 2025',
      priority: 'MEDIUM',
      projectId: projectId,
      parentTaskId: taskData.task.id,
      startDate: '2025-01-05',
      dueDate: '2025-01-07',
      progress: 50,
      estimatedHours: 4
    }),
  });

  if (!subtaskRes.ok) {
    console.error('❌ Subtask creation failed:', await subtaskRes.text());
    return;
  }

  const subtaskData = await subtaskRes.json();
  console.log('✅ Subtask created successfully!');
  console.log('   ID:', subtaskData.task.id);
  console.log('   Title:', subtaskData.task.title);
  console.log('   Parent Task:', subtaskData.task.parentTask?.title);
  console.log('   Progress:', subtaskData.task.progress + '%');

  // Step 6: Fetch tasks by project
  console.log('\n6️⃣  Fetching tasks for project...');
  const projectTasksRes = await fetch(`${baseURL}/api/projects/${projectId}/tasks`, {
    headers: {
      'Cookie': `token=${token}`
    },
  });

  if (!projectTasksRes.ok) {
    console.error('❌ Failed to fetch project tasks:', await projectTasksRes.text());
    return;
  }

  const projectTasksData = await projectTasksRes.json();
  console.log('✅ Project tasks fetched successfully!');
  console.log(`   Total tasks: ${projectTasksData.tasks.length}`);
  projectTasksData.tasks.forEach((t: any) => {
    const isSubtask = t.parentTask ? '  ↳ ' : '  - ';
    console.log(`${isSubtask}${t.title} (${t.progress}%, ${t._count.subtasks} subtasks)`);
  });

  // Step 7: Get project details with stats
  console.log('\n7️⃣  Fetching project details...');
  const projectDetailRes = await fetch(`${baseURL}/api/projects/${projectId}`, {
    headers: {
      'Cookie': `token=${token}`
    },
  });

  if (!projectDetailRes.ok) {
    console.error('❌ Failed to fetch project details:', await projectDetailRes.text());
    return;
  }

  const projectDetailData = await projectDetailRes.json();
  console.log('✅ Project details fetched successfully!');
  console.log('   Name:', projectDetailData.project.name);
  console.log('   Total Tasks:', projectDetailData.project.taskCount);
  console.log('   Completed:', projectDetailData.project.completedTaskCount);
  console.log('   Progress:', projectDetailData.project.progress + '%');
  console.log('   Status Breakdown:');
  projectDetailData.project.taskStatusBreakdown.forEach((stat: any) => {
    console.log(`     - ${stat.status}: ${stat._count}`);
  });

  console.log('\n✅ All tests completed successfully! 🎉');
  console.log('\n📊 Summary:');
  console.log('   ✓ Authentication working');
  console.log('   ✓ Project creation working');
  console.log('   ✓ Task creation with new fields working');
  console.log('   ✓ Subtask creation working');
  console.log('   ✓ Project stats calculation working');
  console.log('   ✓ Task filtering by project working');
}

// Run tests
testAPIs().catch(console.error);
