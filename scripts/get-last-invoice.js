/**
 * Fetches the last invoice for a given RUT from the OpenFactura API.
 */

const http = require('http');

async function fetchReceivedDocuments(rut) {
  const postData = JSON.stringify({
    page: 1,
    filters: {},
  });

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
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(new Error('Failed to parse JSON response.'));
          }
        } else {
          reject(new Error(`HTTP error! status: ${res.statusCode}, body: ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Problem with request: ${e.message}`));
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  const rut = process.argv[2];
  if (!rut) {
    console.error('Please provide a RUT as a command-line argument.');
    process.exit(1);
  }

  try {
    const data = await fetchReceivedDocuments(rut);

    if (data.documents && data.documents.length > 0) {
      console.log(JSON.stringify(data.documents, null, 2));
    } else {
      console.error('No invoices found.');
    }
  } catch (error) {
    console.error('Error fetching documents:', error.message);
    process.exit(1);
  }
}

main();
