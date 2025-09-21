/**
 * Local test for OpenFactura integration
 * Run this after starting the dev server: npm run dev
 */

const BASE_URL = 'http://localhost:3000';

async function testLocalAPI() {
  console.log('🧪 Testing Local OpenFactura API Integration...\n');

  try {
    // Test 1: Basic request
    console.log('📋 Test 1: Basic request...');
    const response1 = await fetch(`${BASE_URL}/api/documents/received`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 1 })
    });

    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ Success!');
      console.log(`📊 Found ${data1.documents.length} documents`);
      console.log(`📄 Total: ${data1.pagination.total} documents across ${data1.pagination.lastPage} pages`);
      console.log(`💰 Total amount: $${data1.summary.totalAmount.toLocaleString('es-CL')}`);

      if (data1.documents.length > 0) {
        const sample = data1.documents[0];
        console.log('\n📄 Sample document:');
        console.log(`   - ID: ${sample.id}`);
        console.log(`   - Type: ${sample.tipoDocumentoNombre} (${sample.tipoDocumento})`);
        console.log(`   - Folio: ${sample.folio}`);
        console.log(`   - Issuer: ${sample.razonSocialEmisor}`);
        console.log(`   - Amount: $${sample.montos.total.toLocaleString('es-CL')}`);
        console.log(`   - Date: ${sample.fechaEmision}`);
      }
    } else {
      const error1 = await response1.text();
      console.log('❌ Error:', response1.status, error1);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Filter by document type
    console.log('📋 Test 2: Filter by Facturas (Type 33)...');
    const response2 = await fetch(`${BASE_URL}/api/documents/received`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 1, tipoDTE: 33 })
    });

    if (response2.ok) {
      const data2 = await response2.json();
      console.log(`✅ Found ${data2.documents.length} Facturas`);
      console.log(`💰 Total Facturas amount: $${data2.summary.totalAmount.toLocaleString('es-CL')}`);
    } else {
      const error2 = await response2.text();
      console.log('❌ Error:', response2.status, error2);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Get endpoint info
    console.log('📋 Test 3: Get endpoint info...');
    const response3 = await fetch(`${BASE_URL}/api/documents/received`, {
      method: 'GET'
    });

    if (response3.ok) {
      const info = await response3.json();
      console.log('✅ Endpoint info:');
      console.log(`🏢 Company RUT: ${info.companyRut}`);
      console.log(`🔧 Endpoint: ${info.endpoint}`);
      console.log(`📝 Description: ${info.description}`);
      console.log(`🎯 Available filters: ${Object.keys(info.availableFilters).join(', ')}`);
    } else {
      const error3 = await response3.text();
      console.log('❌ Error:', response3.status, error3);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.log('\n🔍 Make sure you have:');
    console.log('   1. Started the dev server: npm run dev');
    console.log('   2. API is running on http://localhost:3000');
  }
}

// Instructions
console.log('🚀 OpenFactura API Local Test');
console.log('📝 To run this test:');
console.log('   1. Start dev server: npm run dev');
console.log('   2. Run this test: node test-local-api.js\n');

// Run if this is the main module
if (require.main === module) {
  testLocalAPI();
}

module.exports = { testLocalAPI };