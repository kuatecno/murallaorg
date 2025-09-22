# OpenFactura Sync System

## Overview

This system automatically imports received tax documents from OpenFactura into your local database, providing better performance and data control.

## Features

- **Manual Sync**: Trigger immediate sync via UI button
- **Auto Sync**: Daily automatic sync at midnight (00:00 UTC)
- **Smart Import**: Handles duplicates and updates existing records
- **Sync Status**: Real-time sync status and last sync information
- **Performance**: Local database queries instead of external API calls

## API Endpoints

### Manual Sync
```
POST /api/sync/openfactura
```
Triggers immediate sync of OpenFactura documents with configurable parameters.

**Request Body (optional):**
```json
{
  "months": 3,              // Sync last N months (alternative to date range)
  "fromDate": "2024-01-01", // Start date (YYYY-MM-DD format)
  "toDate": "2024-12-31",   // End date (YYYY-MM-DD format)
  "chunkSize": 90           // Days per API call (30-120, default: 90)
}
```

**Query Parameters (alternative):**
```
POST /api/sync/openfactura?months=6&chunkSize=60
```

**Response:**
```json
{
  "success": true,
  "message": "OpenFactura sync completed successfully",
  "stats": {
    "totalDocuments": 150,
    "newDocuments": 25,
    "updatedDocuments": 5,
    "skippedDocuments": 120,
    "errors": 0,
    "pages": 8,
    "chunks": 4,
    "startTime": "2025-01-15T12:00:00Z",
    "endTime": "2025-01-15T12:03:45Z",
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31",
      "totalDays": 365
    }
  }
}
```

### Sync Status
```
GET /api/sync/status
```
Returns sync status and statistics.

**Response:**
```json
{
  "tenant": {
    "id": "tenant-id",
    "name": "Muralla SpA"
  },
  "sync": {
    "lastSync": {
      "newDocuments": 5,
      "updatedDocuments": 2,
      "startTime": "2025-01-15T12:00:00Z",
      "endTime": "2025-01-15T12:00:05Z"
    },
    "timeSinceLastSync": 3600000,
    "isOverdue": false
  },
  "documents": {
    "total": 150,
    "recent": 10,
    "byStatus": {
      "approved": 140,
      "draft": 5,
      "rejected": 5
    }
  }
}
```

### Auto Sync (Cron)
```
POST /api/sync/auto
Authorization: Bearer <CRON_SECRET>
```
Called automatically by Vercel Cron daily at midnight.

## Data Mapping

OpenFactura documents are mapped to the `TaxDocument` model:

| OpenFactura Field | TaxDocument Field | Notes |
|------------------|-------------------|-------|
| `RUTEmisor` + `DV` | `emitterRUT` | Combined format |
| `RznSoc` | `emitterName` | Company name |
| `TipoDTE` | `type` | Mapped to enum |
| `Folio` | `folio` | Document number |
| `MntTotal` | `totalAmount` | Total amount |
| `FchEmis` | `issuedAt` | Issue date |
| All fields | `rawResponse` | Full JSON stored |

## Document Types Mapping

| OpenFactura Code | TaxDocumentType | Description |
|-----------------|-----------------|-------------|
| 33 | FACTURA | Factura Electrónica |
| 34 | FACTURA_EXENTA | Factura No Afecta |
| 39 | BOLETA | Boleta Electrónica |
| 56 | NOTA_DEBITO | Nota de Débito |
| 61 | NOTA_CREDITO | Nota de Crédito |

## Configuration

### Environment Variables

Required in Vercel:
- `OPENFACTURA_API_KEY`: Production OpenFactura API key
- `DATABASE_URL`: PostgreSQL connection string
- `CRON_SECRET`: Secret for cron authentication (optional)

### Vercel Cron Jobs

The system uses Vercel Cron Jobs for 24h auto-sync:

```json
{
  "crons": [
    {
      "path": "/api/sync/auto",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Schedule:** Daily at 00:00 UTC (midnight)

## Usage

### Manual Sync via UI

#### Quick Sync (Default)
1. Go to `/invoices` page
2. Click "Quick Sync" button (syncs last 3 months)
3. Wait for sync to complete
4. Data automatically refreshes

#### Advanced Sync (Configurable)
1. Go to `/invoices` page
2. Click "Advanced Sync" button
3. Configure sync parameters:
   - **Last N Months**: Sync recent data (1-12 months)
   - **Custom Date Range**: Specific from/to dates
   - **Chunk Size**: API call frequency (30-120 days per request)
4. Review sync preview
5. Click "Start Advanced Sync"
6. Monitor progress and completion

#### Sync Configuration Options

**Time Periods:**
- Last 1-12 months (convenient for recent data)
- Custom date range (up to years of historical data)
- Automatic chunking for large periods

**Performance Tuning:**
- 30 days/chunk: Faster processing, more API calls
- 60 days/chunk: Balanced approach
- 90 days/chunk: Default, good for most cases
- 120 days/chunk: Fewer API calls, slower processing

### Check Sync Status

The invoice page automatically shows:
- Last sync time
- Number of documents imported
- Sync status (Up to Date / Overdue)

### Initial Setup

1. **First Sync**: Click "Sync Now" to import initial data
2. **Verify**: Check that documents appear with correct data
3. **Monitor**: Use sync status to monitor ongoing syncs

## Troubleshooting

### Sync Fails

Check browser console or server logs for errors:
- API key configuration
- Database connection
- OpenFactura API limits

### Missing Documents

- Verify OpenFactura API key has correct permissions
- Check date range (default: last 90 days)
- Verify company RUT configuration

### Performance

- Local database provides much faster loading
- Sync runs in background without affecting UI
- Pagination handles large document sets

## Technical Details

### Duplicate Handling

Documents are identified by: `tenantId` + `folio` + `emitterRUT`

- **New documents**: Created with full data
- **Existing documents**: Updated with latest data
- **Unchanged documents**: Skipped to save processing time

### Sync Safety

- Atomic operations: Full sync succeeds or fails
- Error handling: Individual document errors don't stop sync
- Pagination: Handles large datasets without timeouts
- Rate limiting: Respectful delays between API calls

### Data Retention

- All documents stored locally indefinitely
- Raw OpenFactura responses preserved in `rawResponse`
- Sync metadata stored in tenant settings
- No automatic cleanup (manual management available)