/**
 * Test script for OpenFactura Received Documents API
 * Usage: node test-received-docs.js
 */

const API_BASE = 'http://localhost:3000';

async function testReceivedDocuments() {
  console.log('🧪 Testing OpenFactura Received Documents API...\n');

  try {
    // Test 1: Basic request - get recent documents
    console.log('📋 Test 1: Fetching recent documents...');
    const response1 = await fetch(`${API_BASE}/api/documents/received`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page: 1
      })
    });

    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ Success! Found', data1.documents?.length || 0, 'documents');
      console.log('📊 Summary:', data1.summary);
    } else {
      const error1 = await response1.text();
      console.log('❌ Error:', response1.status, error1);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Filtered request - Facturas only
    console.log('📋 Test 2: Fetching only Facturas (Type 33)...');
    const response2 = await fetch(`${API_BASE}/api/documents/received`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page: 1,
        tipoDTE: 33
      })
    });

    if (response2.ok) {
      const data2 = await response2.json();
      console.log('✅ Success! Found', data2.documents?.length || 0, 'facturas');
      if (data2.documents?.length > 0) {
        const sample = data2.documents[0];
        console.log('📄 Sample document:');
        console.log(`   - Folio: ${sample.folio}`);
        console.log(`   - Emisor: ${sample.razonSocialEmisor} (${sample.rutEmisor})`);
        console.log(`   - Fecha: ${sample.fechaEmision}`);
        console.log(`   - Total: $${sample.montos.total.toLocaleString('es-CL')}`);
      }
    } else {
      const error2 = await response2.text();
      console.log('❌ Error:', response2.status, error2);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Advanced filters with date range
    console.log('📋 Test 3: Advanced filters - Date range...');
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const response3 = await fetch(`${API_BASE}/api/documents/received`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page: 1,
        filters: {
          FchEmis: {
            gte: lastMonth.toISOString().split('T')[0],
            lte: today.toISOString().split('T')[0]
          }
        }
      })
    });

    if (response3.ok) {
      const data3 = await response3.json();
      console.log('✅ Success! Found', data3.documents?.length || 0, 'documents in date range');
      console.log('📅 Date range:', lastMonth.toISOString().split('T')[0], 'to', today.toISOString().split('T')[0]);
    } else {
      const error3 = await response3.text();
      console.log('❌ Error:', response3.status, error3);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Get endpoint info
    console.log('📋 Test 4: Getting endpoint information...');
    const response4 = await fetch(`${API_BASE}/api/documents/received`, {
      method: 'GET'
    });

    if (response4.ok) {
      const info = await response4.json();
      console.log('✅ Endpoint info retrieved:');
      console.log('🏢 Company RUT:', info.companyRut);
      console.log('🔍 Available filters:', Object.keys(info.availableFilters).join(', '));
    } else {
      const error4 = await response4.text();
      console.log('❌ Error:', response4.status, error4);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testReceivedDocuments();
}

module.exports = { testReceivedDocuments };