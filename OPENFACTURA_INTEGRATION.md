# OpenFactura Received Documents Integration

## Overview

This integration allows you to fetch received tax documents from OpenFactura's API for your company (RUT: 78.188.363-8). The system provides a simplified interface to access Chilean tax documents received by your business.

## Production API Endpoint

**Base URL:** `https://muralla-nemgeyugy-kua.vercel.app`

**Endpoint:** `/api/documents/received`

## API Usage

### Basic Request

**POST** `/api/documents/received`

```bash
curl -X POST https://muralla-nemgeyugy-kua.vercel.app/api/documents/received \
  -H "Content-Type: application/json" \
  -d '{
    "page": 1
  }'
```

### Simple Filters

```bash
# Get only Facturas (Type 33)
curl -X POST https://muralla-nemgeyugy-kua.vercel.app/api/documents/received \
  -H "Content-Type: application/json" \
  -d '{
    "page": 1,
    "tipoDTE": 33
  }'

# Get documents from specific date
curl -X POST https://muralla-nemgeyugy-kua.vercel.app/api/documents/received \
  -H "Content-Type: application/json" \
  -d '{
    "page": 1,
    "fechaEmision": "2024-01-15"
  }'

# Get documents from specific issuer
curl -X POST https://muralla-nemgeyugy-kua.vercel.app/api/documents/received \
  -H "Content-Type: application/json" \
  -d '{
    "page": 1,
    "rutEmisor": "76264675"
  }'
```

### Advanced Filters with Operators

```bash
# Date range query
curl -X POST https://muralla-nemgeyugy-kua.vercel.app/api/documents/received \
  -H "Content-Type: application/json" \
  -d '{
    "page": 1,
    "filters": {
      "FchEmis": {
        "gte": "2024-01-01",
        "lte": "2024-01-31"
      }
    }
  }'

# Multiple conditions
curl -X POST https://muralla-nemgeyugy-kua.vercel.app/api/documents/received \
  -H "Content-Type: application/json" \
  -d '{
    "page": 1,
    "filters": {
      "TipoDTE": { "eq": 33 },
      "FchEmis": { "gte": "2024-01-01" },
      "MntTotal": { "gt": 100000 }
    }
  }'
```

## Available Filters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number (default: 1) | `1` |
| `tipoDTE` | number | Document type | `33` (Factura) |
| `fechaEmision` | string | Emission date | `"2024-01-15"` |
| `fechaRecepcionOF` | string | OpenFactura reception date | `"2024-01-15"` |
| `fechaRecepcionSII` | string | SII reception date | `"2024-01-15"` |
| `rutEmisor` | string | Issuer RUT (no dots/dash) | `"76264675"` |

## Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equal to (=) | `{"eq": "33"}` |
| `lt` | Less than (<) | `{"lt": "2024-01-15"}` |
| `gt` | Greater than (>) | `{"gt": 100000}` |
| `lte` | Less than or equal (<=) | `{"lte": "2024-01-31"}` |
| `gte` | Greater than or equal (>=) | `{"gte": "2024-01-01"}` |
| `ne` | Not equal (!=) | `{"ne": "39"}` |

## Document Types

| Code | Description |
|------|-------------|
| 33 | Factura Electrónica |
| 34 | Factura No Afecta o Exenta Electrónica |
| 39 | Boleta Electrónica |
| 41 | Boleta No Afecta o Exenta Electrónica |
| 43 | Liquidación Factura Electrónica |
| 46 | Factura de Compra Electrónica |
| 52 | Guía de Despacho Electrónica |
| 56 | Nota de Débito Electrónica |
| 61 | Nota de Crédito Electrónica |

## Response Format

```json
{
  "success": true,
  "pagination": {
    "currentPage": 1,
    "lastPage": 5,
    "total": 150,
    "perPage": 30
  },
  "documents": [
    {
      "id": "76264675-33-12345",
      "rutEmisor": "76264675-K",
      "razonSocialEmisor": "Empresa Ejemplo S.A.",
      "tipoDocumento": 33,
      "tipoDocumentoNombre": "Factura Electrónica",
      "folio": 12345,
      "fechaEmision": "2024-01-15",
      "fechaRecepcionSII": "2024-01-15",
      "fechaRecepcionOF": "2024-01-15",
      "montos": {
        "exento": 0,
        "neto": 84034,
        "iva": 15966,
        "total": 100000
      },
      "formaPago": "1",
      "formaPagoNombre": "Contado",
      "tipoTransaccionCompra": 1,
      "tipoTransaccionCompraNombre": "Compras del giro",
      "acuses": [
        {
          "codEvento": "RECIBO",
          "fechaEvento": "2024-01-15T10:30:00Z",
          "estado": "ACEPTADO"
        }
      ],
      "metadata": {
        "companyRut": "78188363",
        "apiSource": "OpenFactura",
        "retrievedAt": "2024-01-15T12:00:00Z"
      }
    }
  ],
  "summary": {
    "totalDocuments": 150,
    "totalAmount": 15000000,
    "documentTypes": [
      {
        "tipoDocumento": 33,
        "tipoDocumentoNombre": "Factura Electrónica",
        "cantidad": 100,
        "montoTotal": 12000000
      }
    ]
  }
}
```

## JavaScript Integration Example

```javascript
async function fetchReceivedDocuments(filters = {}) {
  try {
    const response = await fetch('/api/documents/received', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page: 1,
        ...filters
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log(`Found ${data.documents.length} documents`);
    console.log(`Total amount: $${data.summary.totalAmount.toLocaleString('es-CL')}`);

    return data;
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
}

// Usage examples
fetchReceivedDocuments(); // Get all recent documents
fetchReceivedDocuments({ tipoDTE: 33 }); // Get only facturas
fetchReceivedDocuments({
  filters: {
    FchEmis: { gte: '2024-01-01', lte: '2024-01-31' }
  }
}); // Get documents from January 2024
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad request (invalid filters)
- `500` - Internal server error
- `502` - OpenFactura API error

Error response format:
```json
{
  "error": "Error description",
  "details": "Additional error details",
  "success": false,
  "status": 400
}
```

## Rate Limits

- Maximum 30 documents per request (OpenFactura limitation)
- Use pagination for larger datasets
- Recommended: Add delays between requests if making many calls

## Testing

Run the included test script:
```bash
node test-received-docs.js
```

## Company Information

- **Company RUT:** 78.188.363-8
- **API Key:** Configured in environment
- **OpenFactura Environment:** Development API

## Next Steps

1. Test the API with different filters
2. Integrate with your frontend application
3. Set up error monitoring and logging
4. Consider caching frequently accessed data
5. Implement webhook handling for real-time updates (if available)