// Test sync API directly to see what's happening
async function testSync() {
  console.log('Testing sync API with Oct 13-15 date range...\n');

  const response = await fetch('https://muralla-kua.vercel.app/api/sync/openfactura', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromDate: '2025-10-13',
      toDate: '2025-10-15'
    })
  });

  const data = await response.json();

  console.log(`Status: ${response.status}\n`);

  if (data.results) {
    data.results.forEach((result: any) => {
      console.log(`\n${result.tenantName} (${result.tenantRUT}):`);
      console.log(`  Total documents: ${result.totalDocuments}`);
      console.log(`  New: ${result.newDocuments}`);
      console.log(`  Updated: ${result.updatedDocuments}`);
      console.log(`  Pages: ${result.pages}`);
    });
  } else {
    console.log('Response:', JSON.stringify(data, null, 2));
  }
}

testSync();
