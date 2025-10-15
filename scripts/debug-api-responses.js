/**
 * Debug OpenFactura API responses for both companies
 * Shows what the API actually returns when filtering by RUTRecep
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

function readEnvKey() {
  const files = ['.env.local', '.env'];
  for (const f of files) {
    const p = path.join(process.cwd(), f);
    if (fs.existsSync(p)) {
      const txt = fs.readFileSync(p, 'utf8');
      const m = txt.match(/^OPENFACTURA_API_KEY=(.*)$/m);
      if (m && m[1]) return m[1].trim();
    }
  }
  return process.env.OPENFACTURA_API_KEY || '';
}

function postJson(url, headers, body) {
  const u = new URL(url);
  const payload = JSON.stringify(body);
  const options = {
    hostname: u.hostname,
    port: u.port || 443,
    path: u.pathname + (u.search || ''),
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function fetchWithFilter(apikey, rutNumber, companyName) {
  const url = 'https://api.haulmer.com/v2/dte/document/received';
  const headers = { apikey };
  const body = { Page: '1', RUTRecep: { eq: rutNumber } };

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 Fetching invoices for ${companyName} (RUT: ${rutNumber})`);
  console.log(`📤 Request payload: ${JSON.stringify(body, null, 2)}`);
  console.log('='.repeat(80));

  const json = await postJson(url, headers, body);
  const docs = json?.data || [];

  console.log(`📥 Received ${docs.length} documents`);

  if (docs.length > 0) {
    console.log('\n📋 First 3 documents:');
    docs.slice(0, 3).forEach((doc, i) => {
      console.log(`\n  Document ${i + 1}:`);
      console.log(`    Folio: ${doc.Folio}`);
      console.log(`    TipoDTE: ${doc.TipoDTE}`);
      console.log(`    Emitter: ${doc.RznSoc} (${doc.RUTEmisor}-${doc.DV})`);
      console.log(`    RUTRecep in response: ${doc.RUTRecep || 'NOT PRESENT'}`);
      console.log(`    DVRecep in response: ${doc.DVRecep || 'NOT PRESENT'}`);
      console.log(`    RznSocRecep in response: ${doc.RznSocRecep || 'NOT PRESENT'}`);
      console.log(`    Issue Date: ${doc.FchEmis}`);
      console.log(`    Total: ${doc.MntTotal}`);
    });

    // Check if ANY document has RUTRecep field
    const hasRUTRecep = docs.some(d => d.RUTRecep !== undefined);
    console.log(`\n  ℹ️  RUTRecep field present in any document: ${hasRUTRecep ? 'YES' : 'NO'}`);

    return docs;
  }

  return [];
}

async function main() {
  const apikey = readEnvKey();
  if (!apikey) {
    console.error('❌ Missing OPENFACTURA_API_KEY in .env(.local) or environment');
    process.exit(1);
  }

  try {
    const murallaRutNum = 78188363;     // 78.188.363-8
    const murallitaRutNum = 78225753;   // 78.225.753-6

    const murallaDocs = await fetchWithFilter(apikey, murallaRutNum, 'Muralla SPA');
    const murallitaDocs = await fetchWithFilter(apikey, murallitaRutNum, 'Murallita MEF EIRL');

    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Muralla SPA documents: ${murallaDocs.length}`);
    console.log(`Murallita MEF EIRL documents: ${murallitaDocs.length}`);

    // Check if they have identical folios
    const murallaFolios = new Set(murallaDocs.slice(0, 5).map(d => d.Folio));
    const murallitaFolios = new Set(murallitaDocs.slice(0, 5).map(d => d.Folio));

    const commonFolios = [...murallaFolios].filter(f => murallitaFolios.has(f));

    if (commonFolios.length > 0) {
      console.log(`\n⚠️  PROBLEM: Found ${commonFolios.length} IDENTICAL folios in first 5 results!`);
      console.log(`   This means the API is NOT filtering by RUTRecep properly.`);
      console.log(`   Common folios: ${commonFolios.join(', ')}`);
    } else {
      console.log('\n✅ No identical folios - API filtering appears to work!');
    }

  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
