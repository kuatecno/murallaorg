# Muralla 5.0 API Documentation

## Overview

The Muralla 5.0 system provides a comprehensive REST API for managing products, inventory, customers, suppliers, invoicing, and point-of-sale operations for Chilean businesses. The system is designed to comply with Chilean SII (Servicio de Impuestos Internos) requirements.

✅ **GitHub Auto-Deployment:** Enabled and configured for `main` branch
🔧 **Multi-tenant:** Tenant isolation via API key authentication
🔐 **Secure:** API key authentication required for all endpoints

## Base URL

**Production:** `https://muralla-5-0.vercel.app`

## Authentication

**⚠️ All API endpoints require authentication via API key.**

For detailed authentication setup and configuration, see [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md).

### Quick Start

Include your API key in the `Authorization` header:

```http
Authorization: Bearer muralla_live_YOUR_API_KEY_HERE
```

**API Key Format:**
- Production: `muralla_live_xxxxx`
- Test: `muralla_test_xxxxx`

**Getting Started:**
1. Generate an API key: `npx tsx scripts/generate-api-key.ts`
2. Configure in your application (localStorage or environment variable)
3. Include in all API requests

### Authentication Errors

```json
{
  "error": "Unauthorized: Invalid or missing API key"
}
```

**Status Code:** `401 Unauthorized`

---

## API Overview

### Available Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/products` | GET, POST | Product management |
| `/api/products/[id]` | GET, PUT, DELETE | Single product operations |
| `/api/products/[id]/variants` | GET, POST | Product variants |
| `/api/products/[id]/modifier-groups` | GET, POST | Modifier groups |
| `/api/variants/[id]` | PUT, DELETE | Variant operations |
| `/api/modifier-groups/[id]` | PUT, DELETE | Modifier group operations |
| `/api/modifier-groups/[id]/modifiers` | POST | Add modifiers to group |
| `/api/modifiers/[id]` | PUT, DELETE | Modifier operations |
| `/api/categories` | GET, POST | Category management |
| `/api/categories/[id]` | PUT, DELETE | Single category operations |
| `/api/upload` | POST, DELETE | Image upload/delete |
| `/api/invoices` | GET, POST | Invoice management |
| `/api/invoices/[id]` | GET, PUT, DELETE | Single invoice operations |
| `/api/invoices/[id]/approve` | POST | Approve draft invoice |
| `/api/invoices/[id]/pdf` | GET | Generate invoice PDF |

---

## Products API

Manage products, variants, modifiers, and modifier groups.

### List Products

**GET** `/api/products`

Retrieve all products for the authenticated tenant.

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "sku": "PROD-001",
      "name": "Lemonade",
      "description": "Fresh lemonade",
      "type": "MADE_TO_ORDER",
      "category": "Beverages",
      "brand": "House Brand",
      "unitPrice": 5000,
      "costPrice": 2000,
      "cafePrice": 5000,
      "rappiPrice": 5500,
      "minStock": 0,
      "maxStock": null,
      "unit": "UNIT",
      "images": ["https://..."],
      "isActive": true,
      "variants": [...],
      "modifierGroups": [...]
    }
  ]
}
```

### Create Product

**POST** `/api/products`

Create a new product.

#### Request Body

```json
{
  "sku": "PROD-001",
  "name": "Lemonade",
  "description": "Fresh lemonade",
  "type": "MADE_TO_ORDER",
  "category": "Beverages",
  "brand": "House Brand",
  "unitPrice": 5000,
  "costPrice": 2000,
  "cafePrice": 5000,
  "rappiPrice": 5500,
  "pedidosyaPrice": 5500,
  "uberPrice": 5500,
  "minStock": 0,
  "maxStock": 100,
  "unit": "UNIT",
  "images": ["https://..."]
}
```

**Required Fields:**
- `sku` (string): Unique product identifier
- `name` (string): Product name
- `type` (string): Product type (INPUT, READY_PRODUCT, MANUFACTURED, MADE_TO_ORDER, SERVICE)

### Get Single Product

**GET** `/api/products/[id]`

Get detailed product information including variants and modifier groups.

### Update Product

**PUT** `/api/products/[id]`

Update product information.

### Delete Product

**DELETE** `/api/products/[id]`

Soft delete a product (sets `isActive` to false).

---

## Product Variants API

Manage product variations (sizes, flavors, etc.).

### List Product Variants

**GET** `/api/products/[productId]/variants`

Get all variants for a specific product.

### Create Product Variant

**POST** `/api/products/[productId]/variants`

Create a new variant for a product.

#### Request Body

```json
{
  "name": "Small",
  "displayName": "Small Size",
  "useCustomName": false,
  "description": "12oz size",
  "priceAdjustment": -500,
  "costPrice": 1500,
  "cafePrice": 4500,
  "rappiPrice": 5000,
  "pedidosyaPrice": 5000,
  "uberPrice": 5000,
  "minStock": 10,
  "maxStock": 100,
  "images": ["https://..."],
  "sortOrder": 0,
  "isDefault": false
}
```

**Required Fields:**
- `name` (string): Variant name (e.g., "Small", "Strawberry")

**Variant Naming:**
- Default: `{productName} {variantName}` (e.g., "Lemonade Small")
- Custom: Set `useCustomName: true` and provide `displayName`

### Update Variant

**PUT** `/api/variants/[variantId]`

Update variant details.

### Delete Variant

**DELETE** `/api/variants/[variantId]`

Delete a product variant.

---

## Modifier Groups API

Manage groups of modifiers (e.g., "Milk Options", "Size Options").

### List Modifier Groups

**GET** `/api/products/[productId]/modifier-groups`

Get all modifier groups for a product.

### Create Modifier Group

**POST** `/api/products/[productId]/modifier-groups`

Create a new modifier group.

#### Request Body

```json
{
  "name": "Milk Options",
  "isRequired": false,
  "allowMultiple": false,
  "sortOrder": 0
}
```

### Update Modifier Group

**PUT** `/api/modifier-groups/[groupId]`

Update modifier group details.

### Delete Modifier Group

**DELETE** `/api/modifier-groups/[groupId]`

Delete a modifier group and all its modifiers.

---

## Modifiers API

Manage individual modifiers within groups.

### Create Modifier

**POST** `/api/modifier-groups/[groupId]/modifiers`

Add a modifier to a group.

#### Request Body

```json
{
  "name": "Oat Milk",
  "type": "ADD",
  "priceAdjustment": 500,
  "cafePriceAdjustment": 500,
  "rappiPriceAdjustment": 600,
  "pedidosyaPriceAdjustment": 600,
  "uberPriceAdjustment": 600,
  "sortOrder": 0
}
```

**Modifier Types:**
- `ADD`: Add-on (e.g., "Extra shot")
- `REMOVE`: Removal (e.g., "No ice")

**Channel-Specific Pricing:**
- Base `priceAdjustment` applies to all channels by default
- Optional channel-specific adjustments override base price for that channel

### Update Modifier

**PUT** `/api/modifiers/[modifierId]`

Update modifier details.

### Delete Modifier

**DELETE** `/api/modifiers/[modifierId]`

Delete a modifier.

---

## Categories API

Manage product categories.

### List Categories

**GET** `/api/categories`

Get all categories for the authenticated tenant.

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "name": "Beverages",
      "description": "Hot and cold drinks",
      "emoji": "🥤",
      "color": "#3B82F6",
      "sortOrder": 0,
      "isActive": true,
      "productCount": 15
    }
  ]
}
```

### Create Category

**POST** `/api/categories`

Create a new category.

#### Request Body

```json
{
  "name": "Beverages",
  "description": "Hot and cold drinks",
  "emoji": "🥤",
  "color": "#3B82F6",
  "sortOrder": 0
}
```

### Update Category

**PUT** `/api/categories/[id]`

Update category details.

### Delete Category

**DELETE** `/api/categories/[id]`

Soft delete a category.

---

## Upload API

Upload images to Cloudinary storage.

### Upload Image

**POST** `/api/upload`

Upload an image file.

#### Request

- **Content-Type:** `multipart/form-data`
- **Body:** FormData with `file` field

#### Response

```json
{
  "success": true,
  "url": "https://res.cloudinary.com/...",
  "public_id": "muralla/products/xxx",
  "width": 1920,
  "height": 1080
}
```

### Delete Image

**DELETE** `/api/upload?publicId={publicId}`

Delete an image from Cloudinary.

---

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

## Recent Updates

- ✅ **Authentication Implemented**: API key-based authentication for all endpoints
- ✅ **Products Management**: Full CRUD with variants, modifiers, and modifier groups
- ✅ **Categories Management**: Product categorization system
- ✅ **Image Upload**: Cloudinary integration for product images
- ✅ **Channel-Specific Pricing**: Support for Café, Rappi, PedidosYa, Uber Eats

## Future Enhancements

1. **OpenFactura Integration**: Automatic SII submission for tax documents
2. **PDF Generation**: Enhanced PDF library for invoices and reports
3. **Email Delivery**: Automated invoice and report sending
4. **Payment Integration**: Mercado Pago webhook handling
5. **Recurring Invoices**: Subscription management
6. **Advanced Reporting**: Financial analytics and dashboards
7. **Inventory Tracking**: Stock movements and alerts
8. **Multi-location Support**: Manage multiple store locations

## Support

For API support and questions, please contact the development team or check the project repository.