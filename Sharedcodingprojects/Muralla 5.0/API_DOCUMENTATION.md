# Muralla 5.0 Invoice API Documentation

## Overview

The Muralla 5.0 invoicing system provides a comprehensive API for managing Chilean tax documents including FACTURA, BOLETA, NOTA_CREDITO, NOTA_DEBITO, and GUIA_DESPACHO. The system is designed to comply with Chilean SII (Servicio de Impuestos Internos) requirements.

✅ **GitHub Auto-Deployment:** Enabled and configured for `main` branch.

## Base URL

**Production:** `https://muralla-5-0.vercel.app`

## Authentication

*Note: Authentication is not yet implemented. Currently using tenant-based access.*

## Invoice Endpoints

### 1. List Invoices

**GET** `/api/invoices`

Retrieve a paginated list of invoices with filtering options.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 20 | Number of items per page (max 100) |
| `search` | string | - | Search in folio, emitter name, receiver name, or RUT |
| `status` | string | - | Filter by status: `DRAFT`, `ISSUED`, `CANCELLED`, `REJECTED` |
| `type` | string | - | Filter by type: `FACTURA`, `BOLETA`, `NOTA_CREDITO`, `NOTA_DEBITO`, `GUIA_DESPACHO` |
| `customerId` | string | - | Filter by customer ID |
| `sortBy` | string | createdAt | Sort field: `folio`, `totalAmount`, `issuedAt`, `createdAt` |
| `sortOrder` | string | desc | Sort order: `asc`, `desc` |
| `dateFrom` | string | - | Filter from date (ISO format) |
| `dateTo` | string | - | Filter to date (ISO format) |
| `tenantId` | string | - | Tenant ID (optional) |

#### Response

```json
{
  "data": [
    {
      "id": "clxxx...",
      "type": "FACTURA",
      "folio": "000001",
      "documentCode": 33,
      "emitterRUT": "12345678-9",
      "emitterName": "Mi Empresa",
      "receiverRUT": "87654321-0",
      "receiverName": "Cliente S.A.",
      "netAmount": 84034,
      "taxAmount": 15966,
      "totalAmount": 100000,
      "currency": "CLP",
      "issuedAt": "2025-09-21T10:00:00Z",
      "status": "ISSUED",
      "pdfUrl": null,
      "xmlUrl": null,
      "createdAt": "2025-09-21T09:30:00Z",
      "updatedAt": "2025-09-21T10:00:00Z",
      "customer": {
        "id": "clxxx...",
        "name": "Cliente S.A.",
        "email": "cliente@example.com",
        "rut": "87654321-0",
        "phone": "+56 9 1234 5678"
      },
      "itemCount": 3,
      "items": [
        {
          "id": "clxxx...",
          "productName": "Producto A",
          "quantity": 2,
          "unitPrice": 25000,
          "totalPrice": 50000
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "filters": {
    "search": null,
    "status": null,
    "type": null,
    "customerId": null,
    "sortBy": "createdAt",
    "sortOrder": "desc",
    "dateFrom": null,
    "dateTo": null
  }
}
```

### 2. Create Invoice

**POST** `/api/invoices`

Create a new invoice in DRAFT status.

#### Request Body

```json
{
  "type": "FACTURA",
  "receiverRUT": "87654321-0",
  "receiverName": "Cliente S.A.",
  "emitterRUT": "12345678-9",
  "emitterName": "Mi Empresa",
  "currency": "CLP",
  "customerId": "clxxx...",
  "createTransaction": true,
  "items": [
    {
      "productName": "Producto A",
      "quantity": 2,
      "unitPrice": 25000
    },
    {
      "productName": "Servicio B",
      "quantity": 1,
      "unitPrice": 50000
    }
  ]
}
```

#### Required Fields

- `type`: Document type
- `receiverRUT`: Customer RUT
- `receiverName`: Customer name
- `items`: Array of invoice items (minimum 1)

#### Response

```json
{
  "message": "Invoice created successfully",
  "data": {
    "id": "clxxx...",
    "type": "FACTURA",
    "folio": null,
    "documentCode": null,
    "emitterRUT": "12345678-9",
    "emitterName": "Mi Empresa",
    "receiverRUT": "87654321-0",
    "receiverName": "Cliente S.A.",
    "netAmount": 84034,
    "taxAmount": 15966,
    "totalAmount": 100000,
    "currency": "CLP",
    "issuedAt": null,
    "status": "DRAFT",
    "createdAt": "2025-09-21T09:30:00Z",
    "updatedAt": "2025-09-21T09:30:00Z",
    "customer": null,
    "items": [
      {
        "id": "clxxx...",
        "productName": "Producto A",
        "quantity": 2,
        "unitPrice": 25000,
        "totalPrice": 50000
      },
      {
        "id": "clxxx...",
        "productName": "Servicio B",
        "quantity": 1,
        "unitPrice": 50000,
        "totalPrice": 50000
      }
    ]
  }
}
```

### 3. Get Single Invoice

**GET** `/api/invoices/{id}`

Retrieve detailed information for a specific invoice.

#### Response

```json
{
  "data": {
    "id": "clxxx...",
    "type": "FACTURA",
    "folio": "000001",
    "documentCode": 33,
    "emitterRUT": "12345678-9",
    "emitterName": "Mi Empresa",
    "receiverRUT": "87654321-0",
    "receiverName": "Cliente S.A.",
    "netAmount": 84034,
    "taxAmount": 15966,
    "totalAmount": 100000,
    "currency": "CLP",
    "issuedAt": "2025-09-21T10:00:00Z",
    "status": "ISSUED",
    "pdfUrl": null,
    "xmlUrl": null,
    "createdAt": "2025-09-21T09:30:00Z",
    "updatedAt": "2025-09-21T10:00:00Z",
    "tenant": {
      "id": "clxxx...",
      "name": "Mi Empresa",
      "rut": "12345678-9",
      "address": "Av. Principal 123, Santiago",
      "phone": "+56 2 1234 5678",
      "email": "contacto@miempresa.cl"
    },
    "customer": {
      "id": "clxxx...",
      "name": "Cliente S.A.",
      "email": "cliente@example.com",
      "rut": "87654321-0",
      "phone": "+56 9 1234 5678",
      "address": "Calle Cliente 456, Santiago"
    },
    "transaction": {
      "id": "clxxx...",
      "type": "SALE",
      "status": "COMPLETED",
      "paymentStatus": "PENDING",
      "paymentMethod": null,
      "items": []
    },
    "items": [
      {
        "id": "clxxx...",
        "productName": "Producto A",
        "quantity": 2,
        "unitPrice": 25000,
        "totalPrice": 50000
      }
    ]
  }
}
```

### 4. Update Invoice

**PUT** `/api/invoices/{id}`

Update an invoice (only allowed for DRAFT status).

#### Request Body

```json
{
  "receiverRUT": "87654321-0",
  "receiverName": "Cliente Actualizado S.A.",
  "currency": "CLP",
  "items": [
    {
      "productName": "Producto Actualizado",
      "quantity": 3,
      "unitPrice": 30000
    }
  ]
}
```

#### Response

```json
{
  "message": "Invoice updated successfully",
  "data": {
    // Updated invoice data
  }
}
```

### 5. Approve Invoice

**POST** `/api/invoices/{id}/approve`

Convert a DRAFT invoice to ISSUED status. This action:
- Generates folio number
- Sets document code
- Sets issued date
- Validates all required fields

#### Response

```json
{
  "message": "Invoice approved and issued successfully",
  "data": {
    "id": "clxxx...",
    "type": "FACTURA",
    "folio": "000001",
    "documentCode": 33,
    "status": "ISSUED",
    "issuedAt": "2025-09-21T10:00:00Z",
    // ... rest of invoice data
  }
}
```

### 6. Cancel Invoice

**DELETE** `/api/invoices/{id}`

Cancel an invoice by setting its status to CANCELLED.

#### Response

```json
{
  "message": "Invoice cancelled successfully",
  "data": {
    "id": "clxxx...",
    "status": "CANCELLED",
    "folio": "000001",
    "updatedAt": "2025-09-21T11:00:00Z"
  }
}
```

### 7. Generate PDF

**GET** `/api/invoices/{id}/pdf`

Generate and return PDF for an issued invoice.

#### Requirements

- Invoice must have status `ISSUED`

#### Response

- **Content-Type:** `text/html` (currently returns HTML, will be PDF when library is added)
- **Content-Disposition:** `inline; filename="invoice-{folio}.html"`

*Note: PDF generation will be enhanced with a proper PDF library in future updates.*

## Chilean Tax Document Types

| Type | Document Code | Description |
|------|---------------|-------------|
| `FACTURA` | 33 | Tax Invoice |
| `BOLETA` | 39 | Receipt |
| `NOTA_CREDITO` | 61 | Credit Note |
| `NOTA_DEBITO` | 56 | Debit Note |
| `GUIA_DESPACHO` | 52 | Dispatch Guide |

## Invoice Status Workflow

```
DRAFT → ISSUED → (CANCELLED)
  ↓       ↓
  ↓   REJECTED
  ↓
CANCELLED
```

- **DRAFT**: Editable invoice, can be updated or deleted
- **ISSUED**: Approved invoice with folio number, ready for payment
- **CANCELLED**: Voided invoice
- **REJECTED**: Rejected by tax authority (future enhancement)

## Tax Calculations

- **Net Amount**: Sum of all item totals (quantity × unit price)
- **Tax Amount**: Net amount × 19% (Chilean IVA)
- **Total Amount**: Net amount + Tax amount

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error description",
  "details": "Additional error details (optional)"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `409` - Conflict (duplicate resources)
- `500` - Internal Server Error

## Testing Examples

### Create a test invoice

```bash
curl -X POST https://muralla-5-0.vercel.app/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "type": "FACTURA",
    "receiverRUT": "12345678-9",
    "receiverName": "Test Customer",
    "items": [
      {
        "productName": "Test Product",
        "quantity": 1,
        "unitPrice": 10000
      }
    ]
  }'
```

### List invoices

```bash
curl https://muralla-5-0.vercel.app/api/invoices
```

## Future Enhancements

1. **Authentication & Authorization**: JWT-based authentication
2. **OpenFactura Integration**: Automatic SII submission
3. **PDF Generation**: Proper PDF library integration
4. **Email Delivery**: Automated invoice sending
5. **Payment Integration**: Mercado Pago webhook handling
6. **Recurring Invoices**: Subscription management
7. **Advanced Reporting**: Financial analytics

## Support

For API support and questions, please contact the development team or check the project repository.