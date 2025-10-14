/**
 * Fetches the last invoice folio for a given tenant ID.
 */

const http = require('http');

async function fetchLastInvoiceFolio(tenantId) {
  const postData = JSON.stringify({ tenantId });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/documents/received',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP error! status: ${res.statusCode}, body: ${data}`));
        }
        try {
          const jsonData = JSON.parse(data);
          if (jsonData.documents && jsonData.documents.length > 0) {
            const lastInvoice = jsonData.documents.sort((a, b) => new Date(b.fechaEmision) - new Date(a.fechaEmision))[0];
            resolve(lastInvoice.folio);
          } else {
            reject(new Error('No invoices found for the given tenant.'));
          }
        } catch (error) {
          reject(new Error('Failed to parse JSON response.'));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`Problem with request: ${e.message}`)));
    req.write(postData);
    req.end();
  });
}

async function main() {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('Please provide a tenant ID as a command-line argument.');
    process.exit(1);
  }

  try {
    const folio = await fetchLastInvoiceFolio(tenantId);
    console.log(folio);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();
