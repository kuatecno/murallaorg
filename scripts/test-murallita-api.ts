// Direct test of Murallita API key
const MURALLITA_API_KEY = '53d9254183d44ecfa79ce39a74d8d44d';

async function testMurallitaAPI() {
  console.log('Testing Murallita API key directly...\n');

  const response = await fetch('https://api.haulmer.com/v2/dte/document/received', {
    method: 'POST',
    headers: {
      'apikey': MURALLITA_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Page: '1',
      FchEmis: {
        gte: '2025-10-13',
        lte: '2025-10-15'
      }
    })
  });

  const data = await response.json();

  console.log(`Status: ${response.status}`);
  console.log(`Total pages: ${data.last_page}`);
  console.log(`Documents on page 1: ${data.data.length}\n`);

  console.log('Looking for folio 7123...\n');
  const folio7123 = data.data.find((d: any) => d.Folio === 7123);

  if (folio7123) {
    console.log('✅ FOUND folio 7123!');
    console.log(`   Emitter: ${folio7123.RznSoc}`);
    console.log(`   RUT: ${folio7123.RUTEmisor}-${folio7123.DV}`);
    console.log(`   Amount: $${folio7123.MntTotal}`);
    console.log(`   Date: ${folio7123.FchEmis}`);
  } else {
    console.log('❌ Folio 7123 NOT FOUND');
    console.log('\nFirst 5 folios returned:');
    data.data.slice(0, 5).forEach((d: any) => {
      console.log(`   ${d.Folio} - ${d.RznSoc}`);
    });
  }
}

testMurallitaAPI();
