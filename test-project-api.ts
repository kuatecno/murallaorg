/**
 * Test Project Management API
 */

async function testProjectAPI() {
  const baseUrl = 'http://localhost:3000';

  console.log('🧪 Testing Project Management API...\n');

  try {
    // Step 1: Login
    console.log('1️⃣  Logging in...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'contacto@murallacafe.cl',
        password: 'Muralla2025',
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    const cookies = loginResponse.headers.get('set-cookie');

    console.log('✅ Login successful');
    console.log(`   User: ${loginData.user.firstName} ${loginData.user.lastName}`);
    console.log(`   Role: ${loginData.user.role}\n`);

    // Step 2: Create a project
    console.log('2️⃣  Creating a new project...');
    const createResponse = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || `auth-token=${token}`,
      },
      body: JSON.stringify({
        name: 'API Test Project',
        description: 'Testing new project management features via API',
        color: '#10B981',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Create project failed: ${createResponse.statusText} - ${errorText}`);
    }

    const project = await createResponse.json();
    console.log('✅ Project created successfully');
    console.log(`   ID: ${project.id}`);
    console.log(`   Name: ${project.name}`);
    console.log(`   Color: ${project.color}`);
    console.log(`   Status: ${project.status}\n`);

    // Step 3: Get all projects
    console.log('3️⃣  Fetching all projects...');
    const listResponse = await fetch(`${baseUrl}/api/projects`, {
      headers: {
        'Cookie': cookies || `auth-token=${token}`,
      },
    });

    if (!listResponse.ok) {
      throw new Error(`List projects failed: ${listResponse.statusText}`);
    }

    const listData = await listResponse.json();
    console.log('✅ Projects fetched successfully');
    console.log(`   Total: ${listData.total}`);
    console.log(`   Projects:`);
    listData.projects.forEach((p: any) => {
      console.log(`   - ${p.name} (${p.taskCount || 0} tasks, ${p.progress || 0}% complete)`);
    });
    console.log('');

    // Step 4: Create a task in the project
    console.log('4️⃣  Creating a task in the project...');
    const taskResponse = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || `auth-token=${token}`,
      },
      body: JSON.stringify({
        title: 'Design Phase',
        description: 'Complete the design mockups',
        priority: 'HIGH',
        projectId: project.id,
        startDate: '2025-01-01',
        dueDate: '2025-01-15',
        progress: 25,
        estimatedHours: 40,
      }),
    });

    if (!taskResponse.ok) {
      const errorText = await taskResponse.text();
      throw new Error(`Create task failed: ${taskResponse.statusText} - ${errorText}`);
    }

    const task = await taskResponse.json();
    console.log('✅ Task created successfully');
    console.log(`   ID: ${task.id}`);
    console.log(`   Title: ${task.title}`);
    console.log(`   Project: ${project.name}`);
    console.log(`   Progress: ${task.progress}%`);
    console.log(`   Estimated Hours: ${task.estimatedHours}\n`);

    // Step 5: Get project details with tasks
    console.log('5️⃣  Fetching project with tasks...');
    const detailsResponse = await fetch(`${baseUrl}/api/projects/${project.id}`, {
      headers: {
        'Cookie': cookies || `auth-token=${token}`,
      },
    });

    if (!detailsResponse.ok) {
      throw new Error(`Get project details failed: ${detailsResponse.statusText}`);
    }

    const projectDetails = await detailsResponse.json();
    console.log('✅ Project details fetched successfully');
    console.log(`   Name: ${projectDetails.name}`);
    console.log(`   Total Tasks: ${projectDetails.taskCount}`);
    console.log(`   Overall Progress: ${projectDetails.progress}%\n`);

    console.log('✅✅✅ All API tests passed! 🎉\n');
    console.log('📊 Summary:');
    console.log('   ✓ Authentication working');
    console.log('   ✓ Project creation working');
    console.log('   ✓ Project listing working');
    console.log('   ✓ Task creation with new fields working');
    console.log('   ✓ Project details with statistics working');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Error:', error);
  }
}

testProjectAPI();
