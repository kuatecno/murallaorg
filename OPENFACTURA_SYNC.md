# OpenFactura Integration & Sync System

## Overview

This system automatically syncs received tax documents from OpenFactura into your local database for all configured tenants. It provides:

- **Multi-Tenant Support**: Syncs invoices for all active companies sequentially
- **Sequential Processing**: Each company synced one at a time with clear progress logging
- **Smart Duplicate Prevention**: Updates existing records, creates new ones
- **Line Item Extraction**: Fetches detailed product/service breakdowns
- **Flexible Date Ranges**: Sync by months, custom dates, or default periods
- **Auto Sync**: Daily automatic sync at midnight via Vercel Cron

**Current Tenants:**
- Muralla SPA (RUT: 78.188.363-8)
- Murallita MEF EIRL (RUT: 78.225.753-6)

## Quick Start

### Sync All Companies (Recommended)

```bash
# Sync last 90 days for all companies
curl -X POST https://muralla-kua.vercel.app/api/sync/openfactura

# Sync last 6 months for all companies
curl -X POST https://muralla-kua.vercel.app/api/sync/openfactura \
  -H "Content-Type: application/json" \
  -d '{"months": 6}'
```

### Sync Specific Company Only

```bash
# Sync only Murallita
curl -X POST https://muralla-kua.vercel.app/api/sync/openfactura \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "78225723-4", "months": 3}'
```

## API Endpoints

### 1. Manual Sync

**Endpoint:** `POST /api/sync/openfactura`

Triggers immediate sync of OpenFactura documents for all active tenants (or specific tenant if specified).

#### Request Options

**Body Parameters (all optional):**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `tenantId` | string | Sync specific tenant only | `"78225723-4"` |
| `months` | number | Sync last N months | `6` |
| `fromDate` | string | Start date (YYYY-MM-DD) | `"2024-01-01"` |
| `toDate` | string | End date (YYYY-MM-DD) | `"2024-12-31"` |
| `maxDays` | number | Default days if no dates (default: 90) | `120` |
| `chunkSize` | number | Days per API call (default: 90) | `60` |

**Query Parameters (alternative):**
```bash
POST /api/sync/openfactura?months=6&chunkSize=60
```

#### Response Format

```json
{
  "success": true,
  "message": "OpenFactura sync completed successfully for all tenants",
  "stats": {
    "totalTenants": 2,
    "successfulTenants": 2,
    "failedTenants": 0,
    "totalDocuments": 300,
    "newDocuments": 280,
    "updatedDocuments": 15,
    "skippedDocuments": 5,
    "errors": 0,
    "startTime": "2025-10-14T04:21:57.506Z",
    "endTime": "2025-10-14T04:25:35.881Z",
    "dateRange": {
      "from": "2025-07-16",
      "to": "2025-10-15",
      "totalDays": 91
    },
    "tenantResults": [
      {
        "tenantId": "cmftvluqd0000su0ht2z960f3",
        "tenantName": "Muralla SPA",
        "tenantRUT": "78.188.363-8",
        "totalDocuments": 150,
        "newDocuments": 150,
        "updatedDocuments": 0,
        "skippedDocuments": 0,
        "errors": 0,
        "startTime": "2025-10-14T04:23:09.863Z",
        "endTime": "2025-10-14T04:24:23.161Z",
        "pages": 5,
        "chunks": 1,
        "success": true
      },
      {
        "tenantId": "78225723-4",
        "tenantName": "Murallita MEF EIRL",
        "tenantRUT": "78.225.753-6",
        "totalDocuments": 150,
        "newDocuments": 150,
        "updatedDocuments": 0,
        "skippedDocuments": 0,
        "errors": 0,
        "startTime": "2025-10-14T04:24:25.172Z",
        "endTime": "2025-10-14T04:25:35.870Z",
        "pages": 5,
        "chunks": 1,
        "success": true
      }
    ]
  }
}
```

### 2. Auto Sync (Cron)

**Endpoint:** `POST /api/sync/auto`

Called automatically by Vercel Cron daily at midnight (00:00 UTC).

**Schedule:** Configured in `vercel.json`
```json
{
  "crons": [{
    "path": "/api/sync/auto",
    "schedule": "0 0 * * *"
  }]
}
```

## Sync Behavior

### Multi-Tenant Sequential Processing

When you trigger a sync without specifying `tenantId`:

1. System finds all active tenants with configured RUTs
2. Processes each tenant **sequentially** (one at a time)
3. Shows clear progress logging for each company:

```
================================================================================
🏢 Syncing tenant 1/2: Muralla SPA (78.188.363-8)
================================================================================
  📦 Processing chunk 1/1: 2025-07-16 to 2025-10-15
  📄 Fetched page 1/5 with 30 documents from OpenFactura for Muralla SPA
  ⚙️  Processing 30 documents for Muralla SPA
✅ Successfully synced Muralla SPA: 150 new, 0 updated, 0 skipped

⏳ Waiting before syncing next tenant...

================================================================================
🏢 Syncing tenant 2/2: Murallita MEF EIRL (78.225.753-6)
================================================================================
  📦 Processing chunk 1/1: 2025-07-16 to 2025-10-15
  📄 Fetched page 1/5 with 30 documents from OpenFactura for Murallita MEF EIRL
  ⚙️  Processing 30 documents for Murallita MEF EIRL
✅ Successfully synced Murallita MEF EIRL: 150 new, 0 updated, 0 skipped
```

### Duplicate Prevention

Documents are uniquely identified by: `tenantId` + `emitterRUT` + `folio`

- **New documents**: Created with full data and line items
- **Existing documents**: Updated with latest data, line items replaced
- **Duplicate attempts**: Caught by unique constraint, gracefully skipped

### Date Range Handling

The sync automatically uses **Chilean timezone** (America/Santiago) and adds a 1-day buffer to ensure all invoices are captured:

```javascript
// Example: Default 90-day sync
// Today in Chile: 2025-10-14
// Sync range: 2025-07-16 to 2025-10-15 (tomorrow in Chile)
```

## Known Issues & Debugging

### 🔴 CRITICAL BUG: Identical Invoices Across Tenants

**Status:** Under Investigation

**Problem:**
Both Muralla SPA and Murallita are receiving **identical invoice folios** in the database, which is impossible for separate companies.

**Expected Behavior:**
- Muralla SPA latest folio: **12654**
- Murallita latest folio: **7123**
- Each company should have **different** invoices

**Actual Behavior:**
- Both companies have identical folios: **14228**, **10224115**, **10224112**, etc.
- Invoices are stored with correct `tenantId` but possibly wrong data

**Investigation Findings:**

1. **Sync Code Analysis:**
   - Line 535: `receiverRut: companyRutNumber` - Correctly filters by RUT
   - Lines 580-583: Fallback logic may be masking API issues:
   ```typescript
   const receiverRUT = doc.RUTRecep && doc.DVRecep
     ? `${doc.RUTRecep}-${doc.DVRecep}`
     : tenant.rut || '';  // ← FALLBACK if API doesn't return RUTRecep
   ```

2. **Possible Root Causes:**
   - OpenFactura `/v2/dte/document/received` API ignoring `RUTRecep` filter
   - API not returning `RUTRecep` and `RznSocRecep` fields in response
   - Fallback logic assigning all invoices to all tenants

3. **Verification Queries:**

```bash
# Check if both companies have identical invoices
npx tsx -e "
import prisma from './src/lib/prisma.ts';
const muralla = await prisma.tenant.findFirst({ where: { name: 'Muralla SPA' } });
const murallita = await prisma.tenant.findFirst({ where: { name: { contains: 'Murallita' } } });

const m1 = await prisma.taxDocument.findMany({
  where: { tenantId: muralla.id },
  select: { folio: true, receiverRUT: true },
  take: 5
});

const m2 = await prisma.taxDocument.findMany({
  where: { tenantId: murallita.id },
  select: { folio: true, receiverRUT: true },
  take: 5
});

console.log('Muralla SPA:', m1);
console.log('Murallita:', m2);
await prisma.\$disconnect();
"
```

```bash
# Search for expected folios
npx tsx -e "
import prisma from './src/lib/prisma.ts';
const f1 = await prisma.taxDocument.findMany({ where: { folio: '12654' } });
const f2 = await prisma.taxDocument.findMany({ where: { folio: '7123' } });
console.log('Folio 12654 found:', f1.length);
console.log('Folio 7123 found:', f2.length);
await prisma.\$disconnect();
"
```

**Next Steps:**
1. Add debug logging to capture raw OpenFactura API responses
2. Verify `RUTRecep` exists in API response
3. Remove fallback logic or add validation to skip invoices without RUTRecep
4. Re-sync and verify correct data separation

## Data Mapping

### OpenFactura → TaxDocument

| OpenFactura Field | Database Field | Notes |
|------------------|----------------|-------|
| `RUTEmisor` + `DV` | `emitterRUT` | Format: "12345678-9" |
| `RznSoc` | `emitterName` | Supplier name |
| `RUTRecep` + `DVRecep` | `receiverRUT` | ⚠️ May be missing in API |
| `RznSocRecep` | `receiverName` | ⚠️ May be missing in API |
| `TipoDTE` | `type` | Mapped to enum |
| `Folio` | `folio` | Document number |
| `MntNeto` | `netAmount` | Net amount |
| `IVA` | `taxAmount` | Tax (19% IVA) |
| `MntTotal` | `totalAmount` | Total amount |
| `FchEmis` | `issuedAt` | Issue date |
| All fields | `rawResponse` | Complete JSON preserved |

### Line Items Extraction

From OpenFactura detail endpoint `/v2/dte/document/{rut}/{type}/{folio}/json`:

| JSON Field | TaxDocumentItem Field |
|------------|----------------------|
| `Detalle[].NmbItem` or `DscItem` | `productName` |
| `Detalle[].QtyItem` | `quantity` |
| `Detalle[].PrcItem` | `unitPrice` |
| `Detalle[].MontoItem` | `totalPrice` |

## Document Types

| Code | Type | Description |
|------|------|-------------|
| 33 | FACTURA | Factura Electrónica |
| 34 | FACTURA | Factura Exenta (mapped to FACTURA) |
| 39 | BOLETA | Boleta Electrónica |
| 56 | NOTA_DEBITO | Nota de Débito |
| 61 | NOTA_CREDITO | Nota de Crédito |

## Configuration

### Environment Variables

Required in production (Vercel):

```bash
OPENFACTURA_API_KEY=your-api-key-here
DATABASE_URL=postgresql://...
CRON_SECRET=optional-cron-secret
```

### Tenant Setup

Each tenant must have:
- Active status: `isActive: true`
- Configured RUT: `rut: "12.345.678-9"`

```sql
-- Check configured tenants
SELECT id, name, rut, "isActive" FROM tenants
WHERE "isActive" = true AND rut IS NOT NULL;
```

## Usage Examples

### Via UI (Invoices Page)

1. **Quick Sync**: Click "Sync Now" button (syncs last 90 days)
2. **Advanced Sync**: Configure custom date ranges and options
3. Monitor progress in real-time

### Via API

```bash
# Default: Last 90 days, all tenants
curl -X POST https://muralla-kua.vercel.app/api/sync/openfactura

# Last 6 months, all tenants
curl -X POST https://muralla-kua.vercel.app/api/sync/openfactura \
  -H "Content-Type: application/json" \
  -d '{"months": 6}'

# Custom date range, specific tenant
curl -X POST https://muralla-kua.vercel.app/api/sync/openfactura \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "78225723-4",
    "fromDate": "2024-01-01",
    "toDate": "2024-12-31"
  }'

# Advanced chunking for large periods
curl -X POST https://muralla-kua.vercel.app/api/sync/openfactura \
  -H "Content-Type: application/json" \
  -d '{
    "months": 12,
    "chunkSize": 60
  }'
```

### Clean & Re-sync

```bash
# Delete all invoices and re-sync fresh data
npx tsx -e "
import prisma from './src/lib/prisma.ts';
await prisma.taxDocumentItem.deleteMany({});
await prisma.taxDocument.deleteMany({});
console.log('Database cleaned');
await prisma.\$disconnect();
"

# Then trigger fresh sync
curl -X POST https://muralla-kua.vercel.app/api/sync/openfactura \
  -d '{"months": 3}'
```

## Performance & Rate Limiting

### API Respectfulness

The sync includes automatic delays:
- **250ms** between document detail requests
- **500ms** between pagination pages
- **1000ms** between date chunks
- **2000ms** between different tenants

### Recommended Settings

| Use Case | Chunk Size | Expected Duration |
|----------|------------|------------------|
| Recent sync (1-3 months) | 90 days | 1-3 minutes |
| Medium sync (3-6 months) | 60 days | 3-5 minutes |
| Large sync (6-12 months) | 60 days | 5-10 minutes |
| Historical (12+ months) | 30 days | 10-20 minutes |

### Vercel Function Limits

- Max execution time: 10 minutes (Hobby plan)
- For larger syncs, consider breaking into smaller chunks

## Troubleshooting

### Missing Invoices

**Problem:** Expected invoices not appearing in database

**Solutions:**
1. Check date range covers invoice issuance date
2. Verify tenant RUT is correct in database
3. Check if invoice receiver RUT matches tenant RUT
4. Review sync logs for errors

### Duplicate Invoices

**Problem:** Same invoice appearing multiple times

**Current Status:** Should be prevented by unique constraint

**Check:**
```sql
SELECT "emitterRUT", folio, "tenantId", COUNT(*)
FROM tax_documents
GROUP BY "emitterRUT", folio, "tenantId"
HAVING COUNT(*) > 1;
```

### Slow Sync Performance

**Problem:** Sync taking too long

**Solutions:**
1. Increase chunk size (60 → 90 days)
2. Reduce date range
3. Sync specific tenant only
4. Check API response times

### Different Data Per Tenant

**Problem:** Both companies receiving same invoices (CURRENT BUG)

**Status:** Under investigation - see "Known Issues" section above

**Temporary Workaround:**
- Sync tenants individually with `tenantId` parameter
- Verify data manually after sync

## Database Schema

### TaxDocument Table

```typescript
model TaxDocument {
  id            String            @id @default(cuid())
  type          TaxDocumentType   // FACTURA, BOLETA, etc.
  folio         String?           // Document number
  documentCode  Int?              // SII document type code
  emitterRUT    String?           // Supplier RUT
  emitterName   String?           // Supplier name
  receiverRUT   String?           // Company RUT (should match tenant)
  receiverName  String?           // Company name
  netAmount     Decimal?          // Net amount
  taxAmount     Decimal?          // IVA (19%)
  totalAmount   Decimal?          // Total
  currency      String            @default("CLP")
  issuedAt      DateTime?         // Issue date
  status        TaxDocumentStatus // DRAFT, ISSUED, etc.
  rawResponse   Json?             // Complete OpenFactura data
  tenantId      String            // Owner tenant
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  items         TaxDocumentItem[]

  @@unique([emitterRUT, folio, tenantId])
}
```

## Legacy Endpoints

### `/api/documents/received` (Deprecated)

**Status:** May be deprecated - use `/api/sync/openfactura` instead

This was an earlier implementation that wrapped OpenFactura API calls. The new sync system provides:
- ✅ Multi-tenant support
- ✅ Local database storage
- ✅ Automatic duplicate handling
- ✅ Line item extraction
- ✅ Better performance

## Support & Debugging

For issues or questions:
1. Check this documentation
2. Review sync logs in Vercel dashboard
3. Use debugging queries above
4. Check GitHub issues/discussions
