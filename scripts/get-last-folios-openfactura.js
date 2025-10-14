/**
 * Directly query OpenFactura for latest received document folios
 * for Muralla (78.188.363-8) and Murallita (78.225.753-6).
 *
 * Reads OPENFACTURA_API_KEY from .env.local or .env in this repo.
 * Outputs two lines:
 *   Muralla: <folio>
 *   Murallita: <folio>
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

function pickLatestByEmission(docs) {
  if (!Array.isArray(docs) || docs.length === 0) return null;
  return [...docs].sort((a, b) => new Date(b.FchEmis) - new Date(a.FchEmis))[0];
}

async function fetchLatestFolioForReceiverRut(apikey, rutNumber) {
  const url = 'https://api.haulmer.com/v2/dte/document/received';
  const headers = { apikey };
  // Minimal payload: first page, filter by receiver RUT
  const body = { Page: '1', RUTRecep: { eq: rutNumber } };
  const json = await postJson(url, headers, body);
  const docs = json?.data || [];
  const latest = pickLatestByEmission(docs);
  return latest ? String(latest.Folio) : '';
}

async function main() {
  const apikey = readEnvKey();
  if (!apikey) {
    console.error('Missing OPENFACTURA_API_KEY in .env(.local) or environment');
    process.exit(1);
  }
  try {
    const murallaRutNum = 78188363;     // 78.188.363-8
    const murallitaRutNum = 78225753;   // 78.225.753-6

    const [murallaFolio, murallitaFolio] = await Promise.all([
      fetchLatestFolioForReceiverRut(apikey, murallaRutNum),
      fetchLatestFolioForReceiverRut(apikey, murallitaRutNum),
    ]);

    console.log(`Muralla: ${murallaFolio}`);
    console.log(`Murallita: ${murallitaFolio}`);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

