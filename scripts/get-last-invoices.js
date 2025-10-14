/**
 * Fetch the last received invoice for Muralla and Murallita.
 *
 * It calls the app's API:
 *  - GET /api/tenants (to discover tenant IDs and RUTs)
 *  - POST /api/documents/received (to list received documents for each tenant)
 *
 * Base URL resolution (in order):
 *  - CLI flag --base or -b (e.g., --base https://your-app.vercel.app)
 *  - env MURALLA_API_BASE_URL
 *  - env NEXT_PUBLIC_API_BASE_URL
 *  - default http://localhost:3000/api
 *
 * Usage examples:
 *  node scripts/get-last-invoices.js
 *  node scripts/get-last-invoices.js --base https://muralla-your-app.vercel.app
 */

const https = require('https');
const http = require('http');

function parseArgs(argv) {
  const args = { base: undefined, numbersOnly: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '--base' || arg === '-b') && argv[i + 1]) {
      args.base = argv[i + 1];
      i++;
    } else if (arg === '--numbers-only' || arg === '--only-numbers' || arg === '-n') {
      args.numbersOnly = true;
    }
  }
  return args;
}

function getBaseApiUrl(cliBase) {
  // Prefer CLI base if provided
  if (cliBase) {
    const u = new URL(cliBase);
    // If user passed a full origin (no /api), append /api
    if (!u.pathname || u.pathname === '/' ) {
      u.pathname = '/api';
    }
    return u.toString().replace(/\/$/, '');
  }
  const envBase = process.env.MURALLA_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, '');
  return 'http://localhost:3000/api';
}

function requestJson(method, urlString, bodyObj) {
  const url = new URL(urlString);
  const isHttps = url.protocol === 'https:';
  const lib = isHttps ? https : http;

  const payload = bodyObj ? JSON.stringify(bodyObj) : undefined;

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + (url.search || ''),
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (payload) {
    options.headers['Content-Length'] = Buffer.byteLength(payload);
  }

  return new Promise((resolve, reject) => {
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = data ? JSON.parse(data) : {};
            resolve(json);
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${e.message}\nBody: ${data}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', (e) => reject(e));
    if (payload) req.write(payload);
    req.end();
  });
}

async function fetchTenants(baseApi) {
  const url = `${baseApi}/tenants`;
  const res = await requestJson('GET', url);
  if (!res || !res.success) {
    throw new Error(`Failed to fetch tenants: ${JSON.stringify(res)}`);
  }
  return res.tenants || [];
}

async function fetchReceivedDocuments(baseApi, tenantId) {
  const url = `${baseApi}/documents/received`;
  // Keep it simple: ask for first page, API defaults to last 90 days
  const body = { tenantId, page: 1 };
  const res = await requestJson('POST', url, body);
  if (!res || !res.success) {
    throw new Error(`Failed to fetch received documents for tenant ${tenantId}: ${JSON.stringify(res)}`);
  }
  return res.documents || [];
}

function pickLatest(documents) {
  if (!documents || documents.length === 0) return null;
  const parseDate = (s) => (s ? new Date(s) : new Date(0));
  // Prefer emission date; fallback to reception dates
  const sorted = [...documents].sort((a, b) => {
    const aDate = parseDate(a.fechaEmision || a.fechaRecepcionSII || a.fechaRecepcionOF);
    const bDate = parseDate(b.fechaEmision || b.fechaRecepcionSII || b.fechaRecepcionOF);
    return bDate - aDate;
  });
  return sorted[0];
}

function formatSummary(label, doc) {
  if (!doc) return `${label}: no invoices found`;
  const total = doc.montos?.total ?? doc.montos?.MntTotal ?? 'N/A';
  return (
    `${label}: ` +
    `Folio ${doc.folio} | ` +
    `${doc.tipoDocumentoNombre || doc.tipoDocumento} | ` +
    `Emisor ${doc.razonSocialEmisor} (${doc.rutEmisor}) | ` +
    `Emisión ${doc.fechaEmision} | Total ${total}`
  );
}

async function main() {
  const { base, numbersOnly } = parseArgs(process.argv);
  const baseApi = getBaseApiUrl(base);

  if (!numbersOnly) {
    console.log(`Using API base: ${baseApi}`);
  }

  try {
    const tenants = await fetchTenants(baseApi);
    if (!tenants.length) {
      console.error('No active tenants found.');
      process.exit(1);
    }

    // Target by RUTs (authoritative), fallback to name match if needed
    const murallaRut = '78.188.363-8';
    const murallitaRut = '78.225.753-6';

    const muralla = tenants.find(t => t.rut === murallaRut) || tenants.find(t => /muralla/i.test(t.name) && !/murallita/i.test(t.name));
    const murallita = tenants.find(t => t.rut === murallitaRut) || tenants.find(t => /murallita/i.test(t.name));

    if (!muralla) console.warn('Warning: could not find Muralla tenant by RUT/name');
    if (!murallita) console.warn('Warning: could not find Murallita tenant by RUT/name');

    const targets = [
      muralla ? { label: 'Muralla', tenant: muralla } : null,
      murallita ? { label: 'Murallita', tenant: murallita } : null,
    ].filter(Boolean);

    if (!targets.length) {
      console.error('No target tenants found.');
      process.exit(1);
    }

    for (const { label, tenant } of targets) {
      if (!numbersOnly) {
        console.log(`\nFetching received documents for ${label} (${tenant.name}) [${tenant.id}]...`);
      }
      const docs = await fetchReceivedDocuments(baseApi, tenant.id);
      const latest = pickLatest(docs);
      if (numbersOnly) {
        const folio = latest?.folio ?? '';
        console.log(`${label}: ${folio}`);
      } else {
        console.log(formatSummary(label, latest));
        if (latest) {
          console.log('Last invoice full JSON:');
          console.log(JSON.stringify(latest, null, 2));
        }
      }
    }

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
