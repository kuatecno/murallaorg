# Recipe & Production System - Muralla 5.0

## Overview

This document describes the complete implementation of the Recipe/BOM and Production system for Muralla 5.0, supporting five distinct product types with their corresponding inventory workflows.

## Product Types

### 1. INPUT (Insumos - Raw Materials & Ingredients)
- Raw materials and ingredients
- Used to make other products (in recipes)
- **Cannot be sold directly**
- Direct inventory management

**Flow:**
```
Purchase → Stock In → Used as ingredient in recipes
```

### 2. READY_PRODUCT (Productos comprados listos para vender)
- Products bought ready to sell
- No recipe/BOM required
- Direct inventory management

**Flow:**
```
Purchase → Stock In → Sale
```

### 3. MANUFACTURED (Productos producidos con receta)
- Products made from ingredients using recipes
- Batch production with cost tracking
- Ingredients consumed during production

**Flow:**
```
Purchase Insumos → Stock In
↓
Production Batch Created (PLANNED)
↓
Start Production → Consume Insumos (PRODUCTION_INPUT)
↓
Complete Production → Add Finished Product (PRODUCTION_OUTPUT)
↓
Sale → Stock Out (SALIDA_VENTA)
```

### 4. MADE_TO_ORDER (Productos elaborados al momento)
- Products made on-the-spot when ordered
- Real-time ingredient deduction
- No intermediate stock of finished product

**Flow:**
```
Purchase Inputs → Stock In
↓
Sale Order → Auto-deduct Inputs (SALE_CONSUMPTION)
↓
Product Created & Sold (No stock)
```

### 5. SERVICE
- Non-physical services
- No inventory impact

---

## Database Schema

### Core Models

#### Product
```prisma
model Product {
  type          ProductType  @default(PURCHASED)
  hasRecipe     Boolean      @default(false)

  // Platform integration
  cafePrice     Decimal?
  rappiPrice    Decimal?
  pedidosyaPrice Decimal?
  uberPrice     Decimal?

  // Relations
  recipesAsProduct    Recipe[]
  recipesAsIngredient RecipeIngredient[]
}
```

#### Recipe
```prisma
model Recipe {
  productId     String
  name          String
  servingSize   Int       @default(1)
  difficulty    RecipeDifficulty
  instructions  String?

  // Costing
  estimatedCost Decimal?
  totalCost     Decimal?

  // Version control
  version       Int       @default(1)
  isDefault     Boolean   @default(false)

  ingredients   RecipeIngredient[]
}
```

#### RecipeIngredient (BOM Component)
```prisma
model RecipeIngredient {
  recipeId      String
  ingredientId  String  // References Product
  quantity      Decimal
  unit          String
  isOptional    Boolean @default(false)
  unitCost      Decimal?
  totalCost     Decimal?
}
```

#### ProductionBatch
```prisma
model ProductionBatch {
  batchNumber     String
  recipeId        String
  plannedQuantity Int
  actualQuantity  Int?
  status          ProductionStatus

  // Costing
  ingredientCost  Decimal?
  laborCost       Decimal?
  totalCost       Decimal?
  costPerUnit     Decimal?
}
```

#### IngredientConsumption
```prisma
model IngredientConsumption {
  transactionId   String?  // Sale that triggered consumption
  productId       String   // MADE_TO_ORDER product
  recipeId        String
  ingredientId    String
  quantityUsed    Decimal
  cost            Decimal?
}
```

---

## API Endpoints

### Recipes

#### `GET /api/recipes?productId={id}`
Get all recipes for a product

#### `POST /api/recipes`
Create a new recipe
```json
{
  "productId": "prod_123",
  "name": "Latte Recipe",
  "description": "Classic latte",
  "servingSize": 1,
  "prepTime": 5,
  "difficulty": "EASY",
  "isDefault": true
}
```

#### `POST /api/recipes/{id}/ingredients`
Add ingredient to recipe
```json
{
  "ingredientId": "prod_456",
  "quantity": 250,
  "unit": "ml",
  "isOptional": false
}
```

#### `GET /api/recipes/projected-inventory?productId={id}`
Get how many units can be made with current stock

**Response:**
```json
{
  "productId": "prod_123",
  "productName": "Latte",
  "canMake": 50,
  "limitingIngredient": {
    "id": "prod_milk",
    "name": "Milk",
    "available": 5000,
    "required": 250
  },
  "recipe": {
    "ingredients": [...]
  }
}
```

### Production

#### `POST /api/production`
Create production batch
```json
{
  "recipeId": "recipe_123",
  "productId": "prod_123",
  "plannedQuantity": 50,
  "notes": "Morning batch"
}
```

#### `POST /api/production/{id}/start`
Start production (consumes ingredients)

#### `POST /api/production/{id}/complete`
Complete production (adds to stock)
```json
{
  "actualQuantity": 48,
  "laborCost": 5000,
  "overheadCost": 2000
}
```

#### `POST /api/production/{id}/cancel`
Cancel production (returns ingredients if started)
```json
{
  "reason": "Quality issue"
}
```

#### `GET /api/production/stats`
Get production statistics

### Sales

#### `POST /api/sales`
Process sale (handles all product types automatically)
```json
{
  "customerId": "cust_123",
  "items": [
    {
      "productId": "prod_latte",
      "productName": "Latte",
      "quantity": 2,
      "unitPrice": 3500
    }
  ],
  "paymentMethod": "CASH"
}
```

#### `POST /api/sales/check-availability`
Check if product can be sold
```json
{
  "productId": "prod_123",
  "quantity": 5
}
```

**Response:**
```json
{
  "available": true,
  "reason": null
}
```

### Products

#### `POST /api/products`
Create product (auto-creates recipe for MANUFACTURED/MADE_TO_ORDER)
```json
{
  "sku": "LATTE-001",
  "name": "Latte",
  "type": "MADE_TO_ORDER",
  "unitPrice": 3500,
  "costPrice": 1200,
  "cafePrice": 3500,
  "rappiPrice": 4000
}
```

---

## Services

### RecipeService

**Key Methods:**
- `createRecipe()` - Create recipe with automatic costing
- `addIngredient()` - Add ingredient and update costs
- `updateRecipeCosts()` - Recalculate recipe costs
- `getProjectedInventory()` - Calculate how many can be made
- `checkIngredientAvailability()` - Verify ingredients available
- `duplicateRecipe()` - Create new version
- `setDefaultRecipe()` - Set recipe as default

### ProductionService

**Key Methods:**
- `createBatch()` - Create production batch
- `startProduction()` - Consume ingredients, start batch
- `completeProduction()` - Add finished product to stock
- `cancelBatch()` - Cancel and return ingredients
- `getProductionStats()` - Get production analytics

### SalesService

**Key Methods:**
- `processSale()` - Handle sale (auto-detects product type)
- `processPurchasedProduct()` - Simple stock deduction
- `processManufacturedProduct()` - Stock deduction
- `processMadeToOrderProduct()` - Auto-deduct ingredients
- `checkAvailability()` - Check if sale is possible
- `getSalesStats()` - Get sales analytics

### ProductService

**Key Methods:**
- `createProduct()` - Create with auto-recipe for MANUFACTURED/MADE_TO_ORDER
- `getProductsByType()` - Filter by product type
- `getIngredientsProducts()` - Get available ingredients
- `updateProduct()` - Update with type-specific logic
- `adjustStock()` - Manual stock adjustment

---

## Movement Types

```typescript
enum MovementType {
  PURCHASE              // Buy insumos/products
  SALE                  // Sell finished product
  TRANSFER              // Move between locations
  ADJUSTMENT            // Stock correction
  RETURN                // Return to supplier
  DAMAGE                // Damaged/expired
  PRODUCTION            // Legacy production
  PRODUCTION_INPUT      // Consume insumos for production
  PRODUCTION_OUTPUT     // Add manufactured product to stock
  SALE_CONSUMPTION      // Auto-deduct for MADE_TO_ORDER
}
```

---

## Usage Examples

### Create INPUT Product (Ingredient)
```typescript
const milk = await productService.createProduct({
  sku: 'MILK-1L',
  name: 'Whole Milk 1L',
  type: 'INPUT',
  unitPrice: 0, // Inputs don't have selling price
  costPrice: 800,
  minStock: 20,
  unit: 'L',
  tenantId: 'tenant_123'
});
```

### Create READY_PRODUCT (Purchased finished product)
```typescript
const cola = await productService.createProduct({
  sku: 'COLA-500',
  name: 'Coca Cola 500ml',
  type: 'READY_PRODUCT',
  unitPrice: 1500,
  costPrice: 800,
  minStock: 50,
  tenantId: 'tenant_123'
});
```

### Create MADE_TO_ORDER Product with Recipe
```typescript
// 1. Create product
const latte = await productService.createProduct({
  sku: 'LATTE-001',
  name: 'Latte',
  type: 'MADE_TO_ORDER',
  unitPrice: 3500,
  tenantId: 'tenant_123'
});

// 2. Get default recipe (auto-created)
const recipe = await recipeService.getDefaultRecipe(latte.id, 'tenant_123');

// 3. Add ingredients
await recipeService.addIngredient(recipe.id, {
  ingredientId: 'prod_espresso',
  quantity: 30,
  unit: 'ml'
}, 'tenant_123');

await recipeService.addIngredient(recipe.id, {
  ingredientId: 'prod_milk',
  quantity: 250,
  unit: 'ml'
}, 'tenant_123');
```

### Create MANUFACTURED Product and Produce
```typescript
// 1. Create product
const bread = await productService.createProduct({
  sku: 'BREAD-001',
  name: 'Artisan Bread',
  type: 'MANUFACTURED',
  unitPrice: 2500,
  tenantId: 'tenant_123'
});

// 2. Add recipe ingredients
// ... (same as above)

// 3. Create production batch
const batch = await productionService.createBatch({
  recipeId: recipe.id,
  productId: bread.id,
  plannedQuantity: 20,
  tenantId: 'tenant_123'
});

// 4. Start production
await productionService.startProduction(batch.id, 'tenant_123');
// Ingredients are consumed from stock

// 5. Complete production
await productionService.completeProduction(
  batch.id,
  18,  // actual quantity
  5000,  // labor cost
  2000,  // overhead
  'tenant_123'
);
// Finished product added to stock with calculated cost
```

### Process Sale
```typescript
// Sale automatically handles product type
const sale = await salesService.processSale({
  items: [
    {
      productId: 'prod_latte',  // MADE_TO_ORDER
      productName: 'Latte',
      quantity: 2,
      unitPrice: 3500
    },
    {
      productId: 'prod_cola',   // PURCHASED
      productName: 'Coca Cola',
      quantity: 1,
      unitPrice: 1500
    },
    {
      productId: 'prod_bread',  // MANUFACTURED
      productName: 'Bread',
      quantity: 1,
      unitPrice: 2500
    }
  ],
  paymentMethod: 'CASH',
  tenantId: 'tenant_123'
});

// Results:
// - Latte: Espresso and milk auto-deducted
// - Cola: Stock deducted
// - Bread: Stock deducted
```

---

## Migration

To apply the database changes:

```bash
# Create migration
npx prisma migrate dev --name add_recipe_production_system

# Or push directly (dev only)
npx prisma db push

# Generate Prisma Client
npx prisma generate
```

---

## Features Preserved & Enhanced from Muralla 4.0

✅ **INPUT Products** - Raw materials and ingredients (cannot be sold directly)
✅ **READY_PRODUCT** - Direct buy → stock → sell flow (renamed from PURCHASED)
✅ **MANUFACTURED Products** - Recipe-based production with batch tracking
✅ **MADE_TO_ORDER Products** - Real-time ingredient deduction on sale
✅ **SERVICE Products** - Non-physical services with no inventory impact
✅ **Projected Inventory** - Calculate how many can be made
✅ **Cost Tracking** - Automatic cost rollup from ingredients
✅ **Multi-location** - Supported via inventory records
✅ **Audit Trail** - All movements tracked
✅ **Platform Integration** - Multi-platform pricing preserved
✅ **BOM Components** - Ingredient tracking with quantities
✅ **Production Batches** - Full batch lifecycle management
✅ **Ingredient Consumption** - Detailed consumption tracking

## Product Type Summary

| Type | Description | Has Recipe | Stock Tracking | Can Sell | Use Case |
|------|-------------|------------|----------------|----------|----------|
| INPUT | Raw materials | ❌ | ✅ | ❌ | Milk, flour, coffee beans |
| READY_PRODUCT | Purchased finished goods | ❌ | ✅ | ✅ | Coca-Cola, packaged cookies |
| MANUFACTURED | Batch production | ✅ | ✅ | ✅ | Bread, prepared sauces |
| MADE_TO_ORDER | On-the-spot | ✅ | ❌ | ✅ | Latte, sandwich |
| SERVICE | Non-physical | ❌ | ❌ | ✅ | Delivery, consulting |

---

## Next Steps

1. **Frontend Integration** - Create UI components for recipe/production management
2. **Reporting** - Add production cost reports and ingredient usage analytics
3. **Waste Tracking** - Track production waste and yield percentages
4. **Forecasting** - Predict ingredient needs based on sales forecasts
5. **Multi-location Production** - Support production at different locations

---

## Testing

### Test PURCHASED Product
```bash
curl -X POST http://localhost:3000/api/products \
  -H "x-tenant-id: test" \
  -d '{"sku":"TEST-001","name":"Test Product","type":"PURCHASED","unitPrice":1000}'
```

### Test Recipe Creation
```bash
curl -X POST http://localhost:3000/api/recipes \
  -H "x-tenant-id: test" \
  -d '{"productId":"prod_123","name":"Test Recipe"}'
```

### Test Production Batch
```bash
curl -X POST http://localhost:3000/api/production \
  -H "x-tenant-id: test" \
  -d '{"recipeId":"recipe_123","productId":"prod_123","plannedQuantity":10}'
```

---

## Support

For questions or issues, refer to:
- Prisma Schema: `/prisma/schema.prisma`
- Recipe Service: `/src/app/api/recipes/recipe.service.ts`
- Production Service: `/src/app/api/production/production.service.ts`
- Sales Service: `/src/app/api/sales/sales.service.ts`
