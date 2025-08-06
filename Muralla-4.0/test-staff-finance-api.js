// Test script for Staff Finance API endpoints
const crypto = require('crypto');
const API_BASE = 'http://localhost:3000';

// Generate a properly signed JWT token for testing
const generateTestToken = () => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: 'cmdraj7dh80001sutzoqot97igq',
    username: 'admin',
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
  };
  
  // Create properly signed JWT token using the backend's secret
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  // Use the same secret as the backend (JWT_SECRET || 'changeme')
  const secret = 'changeme';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');
  
  return `${base64Header}.${base64Payload}.${signature}`;
};

const testToken = generateTestToken();
console.log('Generated test token:', testToken.substring(0, 50) + '...');

async function testStaffFinanceEndpoints() {
  console.log('🧪 Testing Staff Finance API Endpoints...\n');
  
  const headers = {
    'Authorization': `Bearer ${testToken}`,
    'Content-Type': 'application/json'
  };

  const endpoints = [
    { name: 'Staff Finance Summary', url: '/api/staff-finance/summary' },
    { name: 'Payroll Runs', url: '/api/payroll/runs' },
    { name: 'Payroll Summary', url: '/api/payroll/summary' },
    { name: 'Employee Expenses', url: '/api/staff-finance/expenses' },
    { name: 'Salary Adjustments', url: '/api/staff-finance/salary-adjustments' },
    { name: 'Expense Categories', url: '/api/staff-finance/categories' }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}...`);
      const response = await fetch(`${API_BASE}${endpoint.url}`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${endpoint.name}: SUCCESS`);
        console.log(`   Response keys: ${Object.keys(data).join(', ')}`);
      } else {
        console.log(`❌ ${endpoint.name}: FAILED (${response.status} ${response.statusText})`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ERROR - ${error.message}`);
    }
    console.log('');
  }
}

// Test the endpoints
testStaffFinanceEndpoints().catch(console.error);
