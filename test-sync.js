/**
 * Test script for OpenFactura Sync
 * Usage: node test-sync.js
 */

const API_BASE = 'http://localhost:3002';

async function testSync() {
  console.log('🧪 Testing OpenFactura Sync...\n');

  try {
    // Test 1: Check sync status
    console.log('📋 Test 1: Checking sync status...');
    const statusResponse = await fetch(`${API_BASE}/api/sync/status`);
    
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log('✅ Status retrieved:');
      console.log(JSON.stringify(status, null, 2));
    } else {
      const error = await statusResponse.text();
      console.log('❌ Status Error:', statusResponse.status, error);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Trigger manual sync
    console.log('📋 Test 2: Triggering manual sync...');
    const syncResponse = await fetch(`${API_BASE}/api/sync/openfactura`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    if (syncResponse.ok) {
      const result = await syncResponse.json();
      console.log('✅ Sync completed:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      const error = await syncResponse.text();
      console.log('❌ Sync Error:', syncResponse.status, error);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Check status again after sync
    console.log('📋 Test 3: Checking status after sync...');
    const statusResponse2 = await fetch(`${API_BASE}/api/sync/status`);
    
    if (statusResponse2.ok) {
      const status = await statusResponse2.json();
      console.log('✅ Updated status:');
      console.log(JSON.stringify(status, null, 2));
    } else {
      const error = await statusResponse2.text();
      console.log('❌ Status Error:', statusResponse2.status, error);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testSync();
}

module.exports = { testSync };
