// Direct test of Muralla API key
const MURALLA_API_KEY = '717c541483da4406af113850262ca09c';

async function testMurallaAPI() {
  console.log('Testing Muralla API key directly...\n');

  const response = await fetch('https://api.haulmer.com/v2/dte/document/received', {
    method: 'POST',
    headers: {
      'apikey': MURALLA_API_KEY,
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

  console.log('Looking for folio 12654 (last Muralla invoice)...\n');
  const folio12654 = data.data.find((d: any) => d.Folio === 12654);

  if (folio12654) {
    console.log('✅ FOUND folio 12654!');
    console.log(`   Emitter: ${folio12654.RznSoc}`);
    console.log(`   RUT: ${folio12654.RUTEmisor}-${folio12654.DV}`);
    console.log(`   Amount: $${folio12654.MntTotal}`);
    console.log(`   Date: ${folio12654.FchEmis}`);
  } else {
    console.log('❌ Folio 12654 NOT FOUND');
  }

  console.log('\nLooking for folio 7123 (Murallita invoice)...\n');
  const folio7123 = data.data.find((d: any) => d.Folio === 7123);

  if (folio7123) {
    console.log('⚠️  FOUND folio 7123 in Muralla API! (This should NOT happen)');
    console.log(`   Emitter: ${folio7123.RznSoc}`);
  } else {
    console.log('✅ Folio 7123 NOT FOUND (correct - it belongs to Murallita)');
  }

  console.log('\nFirst 5 folios returned:');
  data.data.slice(0, 5).forEach((d: any) => {
    console.log(`   ${d.Folio} - ${d.RznSoc}`);
  });
}

testMurallaAPI();
