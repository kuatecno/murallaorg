import { getRUTNumber, formatRUTForAPI } from '../src/lib/chilean-utils';

const OPENFACTURA_API_URL = 'https://api.haulmer.com/v2/dte/document/received';
const OPENFACTURA_API_KEY = process.env.OPENFACTURA_API_KEY;

async function fetchPage(page: number, fromDate: string, toDate: string) {
  const payload = {
    Page: page.toString(),
    FchEmis: {
      gte: fromDate,
      lte: toDate
    }
  };

  const response = await fetch(OPENFACTURA_API_URL, {
    method: 'POST',
    headers: {
      'apikey': OPENFACTURA_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return response.json();
}

(async () => {
  console.log('🔍 Fetching all invoices from OpenFactura API to check for folios 12654 and 7123\n');

  const fromDate = '2025-07-01';
  const toDate = '2025-10-15';

  let allFolios: number[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) {
    console.log(`Fetching page ${page}...`);
    const data = await fetchPage(page, fromDate, toDate);

    if (data.data && data.data.length > 0) {
      const folios = data.data.map((d: any) => d.Folio);
      allFolios = allFolios.concat(folios);
      const preview = folios.slice(0, 5).join(', ');
      console.log(`  Got ${data.data.length} documents (folios: ${preview}...)`);

      hasMore = page < data.last_page;
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`\n📊 Total documents fetched: ${allFolios.length}`);
  console.log(`\n🎯 Searching for expected folios:`);
  console.log(`  Folio 12654: ${allFolios.includes(12654) ? '✅ FOUND' : '❌ NOT FOUND'}`);
  console.log(`  Folio 7123: ${allFolios.includes(7123) ? '✅ FOUND' : '❌ NOT FOUND'}`);

  const sorted = allFolios.sort((a,b) => a-b);
  const preview = sorted.slice(0, 30).join(', ');
  console.log(`\nFirst 30 folios (sorted): ${preview}...`);
})();
