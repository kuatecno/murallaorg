# Muralla 5.0 Migration Plan
## From Complex Monorepo to Simple, Deployable Architecture

---

## 🎯 Core Principles
1. **Single deployable unit** - One Next.js app instead of separate frontend/backend
2. **API Routes over NestJS** - Use Next.js API routes instead of separate backend
3. **Vercel-first deployment** - Optimize for Vercel from day one
4. **Progressive migration** - Import features incrementally, test deployment at each step
5. **Simplified state management** - React Context + React Query instead of complex Redux

---

## 📊 Architecture Comparison

| Aspect | Muralla 4.0 (Problems) | Muralla 5.0 (Solutions) |
|--------|------------------------|-------------------------|
| **Structure** | Monorepo with separate apps | Single Next.js app |
| **Backend** | NestJS on separate port | Next.js API routes |
| **Database** | Complex migrations | Prisma with simple migrations |
| **Deployment** | Railway (complex config) | Vercel (one-click deploy) |
| **WebSockets** | Socket.io server | Vercel Edge Functions + Pusher/Ably |
| **File Structure** | Nested folders | Flat, organized structure |
| **State** | Multiple state managers | Context + React Query |

---

## 🔄 Migration Phases

### Phase 1: Foundation ✅ COMPLETED
- [x] Next.js 14 with App Router
- [x] Prisma with PostgreSQL
- [x] M:M relationship schema
- [x] JWT Authentication system
- [x] Login/Register UI

### Phase 2: Core Business Logic (CURRENT)
**Goal:** Migrate essential business entities and operations

#### 2.1 Product Management
```typescript
// API Routes to create:
/api/products/
  - GET    /api/products           (list with pagination)
  - POST   /api/products           (create)
  - GET    /api/products/[id]      (get single)
  - PUT    /api/products/[id]      (update)
  - DELETE /api/products/[id]      (soft delete)
  - POST   /api/products/import    (CSV import)
  - GET    /api/products/export    (CSV export)

// Features to migrate:
- Product CRUD with validation
- Barcode/SKU management
- Stock tracking
- Price history
- Product categories
- Batch operations
```

#### 2.2 Supplier Management
```typescript
// API Routes:
/api/suppliers/
  - CRUD operations
  - GET /api/suppliers/[id]/products  (products from supplier)
  - POST /api/suppliers/[id]/assign-staff (M:M relationship)
  
// Features:
- Supplier profiles
- Contact management
- Payment terms
- Purchase history
- Staff assignments (M:M)
```

#### 2.3 Customer Management
```typescript
// API Routes:
/api/customers/
  - CRUD operations
  - GET /api/customers/[id]/transactions
  - GET /api/customers/[id]/debt
  - POST /api/customers/[id]/assign-staff

// Features:
- Customer profiles
- Credit limits
- Debt tracking
- Transaction history
- Staff relationships (M:M)
```

### Phase 3: POS System
**Goal:** Simplified, real-time POS without complex WebSocket setup

#### 3.1 Transaction Processing
```typescript
// API Routes:
/api/pos/
  - POST /api/pos/transaction      (create sale)
  - POST /api/pos/void             (void transaction)
  - POST /api/pos/refund           (process refund)
  - GET  /api/pos/daily-summary    (Z report)

// Simplifications:
- Use React Query for real-time updates (polling)
- Store cart in localStorage + Context
- Optimistic UI updates
- Queue offline transactions
```

#### 3.2 Payment Integration
```typescript
// Keep existing integrations but simplify:
- Mercado Pago: Direct API calls from API routes
- TUU API: Mock mode for testing
- Cash handling: Simple calculation
```

### Phase 4: Inventory Management
**Goal:** Real-time inventory without complex state

#### 4.1 Stock Control
```typescript
// API Routes:
/api/inventory/
  - GET  /api/inventory/levels
  - POST /api/inventory/adjustment
  - POST /api/inventory/transfer
  - GET  /api/inventory/movements
  - POST /api/inventory/count

// Features:
- Real-time stock levels
- Movement tracking
- Low stock alerts
- Location management
```

#### 4.2 Purchase Orders
```typescript
// Simplified from Muralla 4.0:
- Create PO from low stock
- Receive goods with barcode scanning
- Auto-update inventory
- Supplier performance tracking
```

### Phase 5: Tax Documents (Chilean Compliance)
**Goal:** Maintain compliance, simplify implementation

```typescript
// API Routes:
/api/tax/
  - POST /api/tax/boleta
  - POST /api/tax/factura
  - GET  /api/tax/documents
  - POST /api/tax/export-sii

// Simplification:
- Use external service for SII integration
- Store documents in PostgreSQL
- PDF generation with React PDF
```

### Phase 6: Reports & Analytics
**Goal:** Server-side rendered reports

```typescript
// API Routes:
/api/reports/
  - GET /api/reports/sales
  - GET /api/reports/inventory
  - GET /api/reports/financial
  - GET /api/reports/staff-performance

// Implementation:
- Server-side data aggregation
- Client-side charts with Chart.js
- Export to Excel/PDF
- Scheduled reports via cron
```

### Phase 7: UI/UX Migration
**Goal:** Modern, responsive UI without complexity

#### Components to Build:
```typescript
// Layout
- DashboardLayout (with sidebar)
- AuthLayout (for login/register)
- POSLayout (fullscreen for POS)

// Shared Components
- DataTable (with sorting/filtering)
- SearchBar (with debouncing)
- Modal (with portal)
- Toast (notifications)
- LoadingSpinner
- ErrorBoundary

// Business Components  
- ProductCard
- CustomerCard
- SupplierCard
- TransactionList
- StockIndicator
- PriceTag
```

### Phase 8: Deployment & DevOps
**Goal:** One-click deployment to Vercel

#### 8.1 Environment Setup
```bash
# .env.local (for development)
DATABASE_URL=postgresql://...
JWT_SECRET=...
NEXT_PUBLIC_MP_PUBLIC_KEY=...
MP_ACCESS_TOKEN=...
TUU_API_KEY=...

# Vercel Environment Variables (same as above)
# Set via Vercel Dashboard
```

#### 8.2 Database
```yaml
# Use Vercel Postgres or Supabase
- Automatic connection pooling
- Automatic backups
- Easy migrations with Prisma
```

#### 8.3 Build Configuration
```json
// package.json
{
  "scripts": {
    "build": "prisma generate && next build",
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

---

## 🚫 What NOT to Migrate

1. **Complex WebSocket architecture** → Use polling or SSE
2. **Separate backend server** → Use API routes
3. **Complex state management** → Use Context + React Query
4. **Monorepo structure** → Single app
5. **Docker/Railway configs** → Vercel handles this
6. **Complex build scripts** → Simple Next.js build
7. **Multiple package.json files** → One package.json
8. **Complex nginx/proxy setup** → Vercel routing

---

## 📝 Implementation Checklist

### Immediate Tasks (Week 1)
- [ ] Create all Product API routes
- [ ] Build Product UI (list, create, edit)
- [ ] Implement CSV import/export
- [ ] Create Supplier CRUD
- [ ] Build Customer management
- [ ] Test deployment to Vercel

### Week 2
- [ ] POS transaction flow
- [ ] Shopping cart implementation  
- [ ] Payment method handling
- [ ] Daily reports (Z report)
- [ ] Receipt printing setup

### Week 3
- [ ] Inventory tracking
- [ ] Stock adjustments
- [ ] Purchase orders
- [ ] Supplier product linking
- [ ] Low stock alerts

### Week 4
- [ ] Tax document generation
- [ ] Report generation
- [ ] Excel exports
- [ ] User permission fine-tuning
- [ ] Performance optimization

---

## 🔧 Technical Decisions

### State Management
```typescript
// Instead of Redux/MobX:
- AuthContext (authentication)
- CartContext (POS cart)
- TenantContext (multi-tenant)
- React Query (server state)
```

### Data Fetching
```typescript
// React Query setup:
- 5 second cache
- Background refetch
- Optimistic updates
- Offline support
```

### File Structure
```
src/
  app/
    (auth)/
      login/
      register/
    (dashboard)/
      dashboard/
      products/
      customers/
      suppliers/
      pos/
    api/
      auth/
      products/
      customers/
      suppliers/
      pos/
  components/
    ui/        (generic components)
    business/  (domain components)
  lib/
    auth/
    prisma/
    utils/
  hooks/
  contexts/
  types/
```

### Error Handling
```typescript
// Consistent error responses:
{
  error: string,
  details?: string[],
  code?: string
}

// Global error boundary
// Toast notifications for user feedback
// Sentry for production monitoring
```

---

## 🎯 Success Metrics

1. **Deployment:** One-click deploy to Vercel works
2. **Performance:** Initial load < 3 seconds
3. **Reliability:** 99.9% uptime
4. **Maintainability:** Single developer can manage
5. **Scalability:** Handles 100+ concurrent users
6. **Cost:** < $50/month for small business

---

## 🚀 Migration Commands

```bash
# Start development
npm run dev

# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Check deployment
vercel logs
```

---

## 📊 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data loss | Incremental migration with backups |
| Feature parity | Prioritize core features first |
| Performance | Use React Query caching aggressively |
| Deployment issues | Test on Vercel preview for each PR |
| User disruption | Maintain Muralla 4.0 until 5.0 stable |

---

## 📅 Timeline

- **Week 1-2:** Core CRUD operations
- **Week 3-4:** POS and transactions  
- **Week 5-6:** Inventory and reports
- **Week 7-8:** Testing and optimization
- **Week 9-10:** Production deployment and migration

---

## 🎉 End Goal

A **simple, maintainable, and easily deployable** business management system that:
- Deploys with one click to Vercel
- Requires no DevOps knowledge
- Scales automatically
- Costs less to run
- Is easier to maintain
- Has better performance
- Provides same functionality as Muralla 4.0
