# Muralla 5.0 Implementation Guide
## Step-by-Step Instructions for Systematic Migration

---

## 🏗️ Current Status

### ✅ Completed
1. **Project Setup**
   - Next.js 14 with App Router
   - TypeScript configuration
   - Tailwind CSS
   - Dependencies installed

2. **Database**
   - Prisma configured with PostgreSQL
   - Complete schema with M:M relationships
   - All entities defined (Staff, Product, Supplier, Customer, etc.)

3. **Authentication**
   - JWT-based auth system
   - Login/Register/Logout API routes
   - Session management
   - Role-based permissions
   - Auth context and middleware
   - Login UI page

### 🚧 Next Steps (In Order)

---

## Step 1: Database Setup & Migration
```bash
# 1. Create a PostgreSQL database (local or cloud)
# Option A: Local PostgreSQL
createdb muralla5_dev

# Option B: Use Vercel Postgres (recommended)
# Go to Vercel Dashboard > Storage > Create Database

# 2. Set DATABASE_URL in .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/muralla5_dev"

# 3. Run initial migration
npx prisma migrate dev --name init

# 4. Generate Prisma Client
npx prisma generate

# 5. Seed initial data (create this file first)
npx prisma db seed
```

### Create Seed File
```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create default tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Company',
      slug: 'demo',
      settings: {
        currency: 'CLP',
        timezone: 'America/Santiago',
      },
      features: ['pos', 'inventory', 'customers', 'suppliers'],
    },
  });

  // Create admin user
  const hashedPassword = await bcrypt.hash('Demo1234', 10);
  await prisma.staff.create({
    data: {
      email: 'admin@muralla.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## Step 2: Core API Routes Implementation

### 2.1 Product APIs
```typescript
// src/app/api/products/route.ts
// GET /api/products - List products with pagination
// POST /api/products - Create new product

// src/app/api/products/[id]/route.ts  
// GET /api/products/[id] - Get single product
// PUT /api/products/[id] - Update product
// DELETE /api/products/[id] - Soft delete

// Key features to implement:
- Tenant isolation (filter by tenantId)
- Pagination (limit/offset)
- Search (by name, SKU, category)
- Sorting (by name, price, stock)
- Include relationships (suppliers, staff)
```

### 2.2 Implementation Pattern
```typescript
// Standard API route pattern to follow:

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import prisma from '@/lib/prisma';

async function handler(request: NextRequest) {
  try {
    const user = (request as any).user;
    const tenantId = user.tenantId;
    
    // Input validation
    // Business logic
    // Database operation with tenant filter
    // Audit log
    // Return response
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler);
export const POST = withAuth(handler);
```

---

## Step 3: React Query Setup

### 3.1 Install React Query
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

### 3.2 Create Query Client
```typescript
// src/app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from '@/contexts/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 1000, // 5 seconds
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 3.3 Create API Hooks
```typescript
// src/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useProducts(params?: ProductParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => fetchProducts(params),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
    },
  });
}
```

---

## Step 4: UI Components Structure

### 4.1 Create Component Library
```typescript
// src/components/ui/DataTable.tsx
// Reusable table with sorting, filtering, pagination

// src/components/ui/Modal.tsx
// Reusable modal with portal

// src/components/ui/Button.tsx
// Consistent button styles

// src/components/ui/Input.tsx
// Form inputs with validation
```

### 4.2 Business Components
```typescript
// src/components/products/ProductList.tsx
// Product grid/list view

// src/components/products/ProductForm.tsx
// Create/edit product form

// src/components/products/ProductCard.tsx
// Individual product display
```

---

## Step 5: Page Implementation

### 5.1 Dashboard Layout
```typescript
// src/app/(dashboard)/layout.tsx
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 5.2 Products Page
```typescript
// src/app/(dashboard)/products/page.tsx
'use client';

import { useProducts } from '@/hooks/useProducts';
import ProductList from '@/components/products/ProductList';
import { Button } from '@/components/ui/Button';

export default function ProductsPage() {
  const { data, isLoading, error } = useProducts();
  
  // Implement:
  // - Loading state
  // - Error handling
  // - Empty state
  // - Product list
  // - Add product button
  // - Search/filter
}
```

---

## Step 6: Testing Each Phase

### 6.1 Local Testing
```bash
# Start dev server
npm run dev

# Test each feature:
1. Login with seeded user
2. Create a product
3. Edit the product
4. Delete the product
5. Check audit logs
```

### 6.2 Deployment Testing
```bash
# Build locally first
npm run build

# Test production build
npm start

# Deploy to Vercel preview
vercel

# Test on preview URL
# Check logs: vercel logs
```

---

## Step 7: Incremental Migration

### 7.1 Migration Order
1. **Products** (simplest, no dependencies)
2. **Suppliers** (links to products)
3. **Customers** (standalone)
4. **POS** (depends on products/customers)
5. **Inventory** (depends on products/suppliers)
6. **Reports** (depends on all)

### 7.2 For Each Module
```
1. Copy business logic from Muralla 4.0
2. Simplify and adapt to API routes
3. Remove unnecessary complexity
4. Test locally
5. Deploy to preview
6. Test on preview
7. Merge to main
```

---

## 🚨 Common Pitfalls to Avoid

### From Muralla 4.0 Experience:

1. **DON'T create separate frontend/backend**
   - Everything in one Next.js app

2. **DON'T use complex WebSocket setup**
   - Use React Query with polling for real-time

3. **DON'T create nested folder structures**
   - Keep it flat and simple

4. **DON'T use multiple package.json files**
   - One package.json at root

5. **DON'T hardcode environment variables**
   - Use process.env everywhere

6. **DON'T skip tenant isolation**
   - Always filter by tenantId in queries

7. **DON'T forget audit logging**
   - Log important actions

8. **DON'T overcomplicate state**
   - Context for client state, React Query for server state

---

## 📋 Daily Development Checklist

- [ ] Pull latest changes
- [ ] Check migration status
- [ ] Implement one complete feature
- [ ] Write/update API route
- [ ] Create UI component
- [ ] Test locally
- [ ] Commit with clear message
- [ ] Deploy to preview
- [ ] Test on preview URL
- [ ] Document any issues

---

## 🔧 Useful Commands

```bash
# Development
npm run dev                  # Start dev server
npx prisma studio           # Open database GUI
npx prisma migrate dev      # Run migrations
npx prisma generate         # Generate client

# Testing
npm run build               # Build for production
npm start                   # Run production build
npx playwright test         # Run E2E tests

# Deployment
vercel                      # Deploy preview
vercel --prod              # Deploy production
vercel env pull            # Pull env vars

# Debugging
npx prisma db push         # Push schema without migration
npx prisma migrate reset   # Reset database
vercel logs                # Check deployment logs
```

---

## 📚 Resources

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [React Query Docs](https://tanstack.com/query)
- [Vercel Docs](https://vercel.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## 🎯 Success Criteria

Before considering a module complete:

1. ✅ All CRUD operations work
2. ✅ Tenant isolation enforced
3. ✅ Proper error handling
4. ✅ Loading states implemented
5. ✅ Responsive design
6. ✅ Deploys to Vercel successfully
7. ✅ No console errors
8. ✅ Audit logs created
9. ✅ Permissions checked
10. ✅ Tests pass

---

## 💡 Pro Tips

1. **Start simple** - Get basic CRUD working first
2. **Deploy often** - Test on Vercel after each feature
3. **Use TypeScript** - Catch errors early
4. **Keep it flat** - Avoid deep nesting
5. **Document as you go** - Update this guide
6. **Test multi-tenant** - Always test with different tenants
7. **Monitor performance** - Use React Query DevTools
8. **Handle errors gracefully** - Show user-friendly messages
9. **Optimize later** - Get it working first
10. **Ask for help** - Don't get stuck on deployment issues
