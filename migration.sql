-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ModifierType" AS ENUM ('ADD', 'REMOVE');

-- CreateEnum
CREATE TYPE "public"."StaffRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'EMPLOYEE', 'CONTRACTOR', 'INTERN');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."AssignmentRole" AS ENUM ('ASSIGNEE', 'REVIEWER', 'OBSERVER');

-- CreateEnum
CREATE TYPE "public"."SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'CONFLICT', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."SyncDirection" AS ENUM ('TO_GOOGLE', 'FROM_GOOGLE', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "public"."MovementType" AS ENUM ('PURCHASE', 'SALE', 'TRANSFER', 'ADJUSTMENT', 'RETURN', 'DAMAGE', 'PRODUCTION', 'PRODUCTION_INPUT', 'PRODUCTION_OUTPUT', 'SALE_CONSUMPTION');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('SALE', 'REFUND', 'EXCHANGE', 'QUOTE');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('DRAFT', 'PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER', 'CHECK', 'CREDIT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."PurchaseStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIAL_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TaxDocumentType" AS ENUM ('BOLETA', 'FACTURA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'GUIA_DESPACHO');

-- CreateEnum
CREATE TYPE "public"."TaxDocumentStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('BANK_ACCOUNT', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'DIGITAL_WALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ReimbursementStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'PARTIALLY_PAID', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ExpensePaymentType" AS ENUM ('COMPANY_ACCOUNT', 'EMPLOYEE_PAID', 'PERSONAL', 'MIXED');

-- CreateEnum
CREATE TYPE "public"."ProductType" AS ENUM ('INPUT', 'READY_PRODUCT', 'MANUFACTURED', 'MADE_TO_ORDER', 'SERVICE');

-- CreateEnum
CREATE TYPE "public"."ProductFormat" AS ENUM ('PACKAGED', 'FROZEN', 'FRESH');

-- CreateEnum
CREATE TYPE "public"."ProductionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."RecipeDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXPERT');

-- CreateEnum
CREATE TYPE "public"."SalaryType" AS ENUM ('HOURLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('ON_TIME', 'LATE', 'ABSENT', 'EARLY_DEPARTURE', 'APPROVED_PTO');

-- CreateEnum
CREATE TYPE "public"."PayrollStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "public"."PTOStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateTable
CREATE TABLE "public"."staff" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "public"."StaffRole" NOT NULL DEFAULT 'EMPLOYEE',
    "department" TEXT,
    "position" TEXT,
    "phone" TEXT,
    "rut" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hireDate" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "salary" DECIMAL(12,2),
    "salaryType" "public"."SalaryType" NOT NULL DEFAULT 'MONTHLY',
    "hourlyRate" DECIMAL(10,2),
    "vacationDaysTotal" INTEGER NOT NULL DEFAULT 15,
    "vacationDaysUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '📦',
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "format" "public"."ProductFormat",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "ean" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "type" "public"."ProductType" NOT NULL DEFAULT 'INPUT',
    "category" TEXT,
    "brand" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "costPrice" DECIMAL(12,2),
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "maxStock" INTEGER,
    "unit" TEXT NOT NULL DEFAULT 'UNIT',
    "format" "public"."ProductFormat",
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hasRecipe" BOOLEAN NOT NULL DEFAULT false,
    "wholesalePrice" DECIMAL(12,2),
    "retailPrice" DECIMAL(12,2),
    "menuSection" TEXT,
    "hoy" BOOLEAN NOT NULL DEFAULT false,
    "cafePrice" DECIMAL(12,2),
    "rappiPrice" DECIMAL(12,2),
    "pedidosyaPrice" DECIMAL(12,2),
    "uberPrice" DECIMAL(12,2),
    "images" JSONB NOT NULL DEFAULT '[]',
    "sourceUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "useCustomName" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "sku" TEXT,
    "price" DECIMAL(12,2),
    "costPrice" DECIMAL(12,2),
    "cafePrice" DECIMAL(12,2),
    "rappiPrice" DECIMAL(12,2),
    "pedidosyaPrice" DECIMAL(12,2),
    "uberPrice" DECIMAL(12,2),
    "minStock" INTEGER,
    "maxStock" INTEGER,
    "images" JSONB NOT NULL DEFAULT '[]',
    "sourceUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."modifier_groups" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT true,
    "minSelections" INTEGER NOT NULL DEFAULT 0,
    "maxSelections" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_modifiers" (
    "id" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."ModifierType" NOT NULL DEFAULT 'ADD',
    "priceAdjustment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cafePriceAdjustment" DECIMAL(12,2),
    "rappiPriceAdjustment" DECIMAL(12,2),
    "pedidosyaPriceAdjustment" DECIMAL(12,2),
    "uberPriceAdjustment" DECIMAL(12,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_modifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contact_type_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_type_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contact_field_configs" (
    "id" TEXT NOT NULL,
    "contactTypeId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "placeholder" TEXT,
    "helpText" TEXT,
    "validation" JSONB,
    "options" JSONB,
    "defaultValue" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_field_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contacts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactType" TEXT NOT NULL,
    "rut" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "contactName" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "creditLimit" DECIMAL(12,2),
    "currentDebt" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentTerms" TEXT,
    "rating" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."staff_contacts" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "commissionRate" DECIMAL(5,2),
    "notes" TEXT,

    CONSTRAINT "staff_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."staff_products" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,

    CONSTRAINT "staff_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_suppliers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierSKU" TEXT,
    "supplierPrice" DECIMAL(12,2) NOT NULL,
    "leadTimeDays" INTEGER,
    "minOrderQty" INTEGER NOT NULL DEFAULT 1,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastPurchase" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "product_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_movements" (
    "id" TEXT NOT NULL,
    "type" "public"."MovementType" NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "supplierId" TEXT,
    "receivedById" TEXT,
    "deliveredById" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "cost" DECIMAL(12,2),
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "status" "public"."TransactionStatus" NOT NULL,
    "contactId" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "public"."PaymentMethod",
    "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transaction_items" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "variantId" TEXT,
    "variantName" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transaction_item_modifiers" (
    "id" TEXT NOT NULL,
    "transactionItemId" TEXT NOT NULL,
    "modifierId" TEXT NOT NULL,
    "modifierName" TEXT NOT NULL,
    "modifierType" "public"."ModifierType" NOT NULL,
    "priceAdjustment" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_item_modifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "public"."PurchaseStatus" NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL,
    "shipping" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recipes" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "servingSize" INTEGER NOT NULL DEFAULT 1,
    "prepTime" INTEGER,
    "cookTime" INTEGER,
    "difficulty" "public"."RecipeDifficulty" NOT NULL DEFAULT 'EASY',
    "instructions" TEXT,
    "estimatedCost" DECIMAL(12,2),
    "laborCost" DECIMAL(12,2),
    "overheadCost" DECIMAL(12,2),
    "totalCost" DECIMAL(12,2),
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "unitCost" DECIMAL(12,2),
    "totalCost" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."production_batches" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "plannedQuantity" INTEGER NOT NULL,
    "actualQuantity" INTEGER,
    "status" "public"."ProductionStatus" NOT NULL DEFAULT 'PLANNED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "ingredientCost" DECIMAL(12,2),
    "laborCost" DECIMAL(12,2),
    "overheadCost" DECIMAL(12,2),
    "totalCost" DECIMAL(12,2),
    "costPerUnit" DECIMAL(12,2),
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ingredient_consumptions" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT,
    "productId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantityUsed" DECIMAL(12,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "cost" DECIMAL(12,2),
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "ingredient_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_records" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "availableQty" INTEGER NOT NULL,
    "lastCountDate" TIMESTAMP(3),
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tax_documents" (
    "id" TEXT NOT NULL,
    "type" "public"."TaxDocumentType" NOT NULL,
    "folio" TEXT,
    "documentCode" INTEGER,
    "transactionId" TEXT,
    "emitterRUT" TEXT,
    "emitterName" TEXT,
    "receiverRUT" TEXT,
    "receiverName" TEXT,
    "netAmount" DECIMAL(12,2),
    "taxAmount" DECIMAL(12,2),
    "totalAmount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "issuedAt" TIMESTAMP(3),
    "status" "public"."TaxDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT,
    "xmlUrl" TEXT,
    "rawResponse" JSONB,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tax_document_items" (
    "id" TEXT NOT NULL,
    "taxDocumentId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "tax_document_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."AccountType" NOT NULL,
    "accountNumber" TEXT,
    "bank" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "balance" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_reimbursements" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "status" "public"."ReimbursementStatus" NOT NULL DEFAULT 'PENDING',
    "paidDate" TIMESTAMP(3),
    "paidAmount" DECIMAL(12,2),
    "paymentAccountId" TEXT,
    "paymentReference" TEXT,
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_reimbursements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#64748B',
    "format" "public"."ProductFormat",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_statuses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748B',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expenses" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "supplier" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT,
    "thirdPartyDocType" TEXT,
    "thirdPartyDocNumber" TEXT,
    "notes" TEXT,
    "paymentType" "public"."ExpensePaymentType" NOT NULL,
    "paymentAccountId" TEXT,
    "staffId" TEXT,
    "reimbursementId" TEXT,
    "isCompanyExpense" BOOLEAN NOT NULL DEFAULT true,
    "excludeFromReports" BOOLEAN NOT NULL DEFAULT false,
    "isFromInvoice" BOOLEAN NOT NULL DEFAULT false,
    "taxDocumentId" TEXT,
    "receiptImageUrl" TEXT,
    "receiptPublicId" TEXT,
    "hasReceipt" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "rut" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "domain" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "features" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "staffId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shifts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" INTEGER,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "specificDate" TIMESTAMP(3),
    "staffId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attendances" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "actualCheckIn" TIMESTAMP(3),
    "actualCheckOut" TIMESTAMP(3),
    "status" "public"."AttendanceStatus" NOT NULL,
    "minutesLate" INTEGER,
    "totalHours" DECIMAL(5,2),
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payroll_runs" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "staffId" TEXT NOT NULL,
    "hoursWorked" DECIMAL(8,2) NOT NULL,
    "regularPay" DECIMAL(12,2) NOT NULL,
    "overtimePay" DECIMAL(12,2),
    "deductions" DECIMAL(12,2),
    "totalPay" DECIMAL(12,2) NOT NULL,
    "netPay" DECIMAL(12,2) NOT NULL,
    "status" "public"."PayrollStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pto_requests" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "public"."PTOStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pto_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "googleChatSpaceId" TEXT,
    "googleChatMessageId" TEXT,
    "googleTaskId" TEXT,
    "googleTasksListId" TEXT,
    "googleTasksUpdatedAt" TIMESTAMP(3),
    "syncStatus" "public"."SyncStatus" NOT NULL DEFAULT 'PENDING',
    "syncDirection" "public"."SyncDirection" NOT NULL DEFAULT 'BIDIRECTIONAL',
    "lastSyncAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_assignments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "role" "public"."AssignmentRole" NOT NULL DEFAULT 'ASSIGNEE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_comments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_email_key" ON "public"."staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_username_key" ON "public"."staff"("username");

-- CreateIndex
CREATE INDEX "staff_tenantId_idx" ON "public"."staff"("tenantId");

-- CreateIndex
CREATE INDEX "categories_tenantId_idx" ON "public"."categories"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_tenantId_key" ON "public"."categories"("name", "tenantId");

-- CreateIndex
CREATE INDEX "products_tenantId_type_idx" ON "public"."products"("tenantId", "type");

-- CreateIndex
CREATE INDEX "products_tenantId_category_idx" ON "public"."products"("tenantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenantId_sku_key" ON "public"."products"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "product_variants_productId_idx" ON "public"."product_variants"("productId");

-- CreateIndex
CREATE INDEX "product_variants_tenantId_idx" ON "public"."product_variants"("tenantId");

-- CreateIndex
CREATE INDEX "modifier_groups_productId_idx" ON "public"."modifier_groups"("productId");

-- CreateIndex
CREATE INDEX "modifier_groups_tenantId_idx" ON "public"."modifier_groups"("tenantId");

-- CreateIndex
CREATE INDEX "product_modifiers_modifierGroupId_idx" ON "public"."product_modifiers"("modifierGroupId");

-- CreateIndex
CREATE INDEX "product_modifiers_tenantId_idx" ON "public"."product_modifiers"("tenantId");

-- CreateIndex
CREATE INDEX "contact_type_configs_tenantId_isActive_idx" ON "public"."contact_type_configs"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "contact_type_configs_tenantId_name_key" ON "public"."contact_type_configs"("tenantId", "name");

-- CreateIndex
CREATE INDEX "contact_field_configs_contactTypeId_isVisible_idx" ON "public"."contact_field_configs"("contactTypeId", "isVisible");

-- CreateIndex
CREATE UNIQUE INDEX "contact_field_configs_contactTypeId_fieldName_key" ON "public"."contact_field_configs"("contactTypeId", "fieldName");

-- CreateIndex
CREATE INDEX "contacts_tenantId_idx" ON "public"."contacts"("tenantId");

-- CreateIndex
CREATE INDEX "contacts_tenantId_contactType_idx" ON "public"."contacts"("tenantId", "contactType");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_tenantId_code_key" ON "public"."contacts"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_tenantId_rut_key" ON "public"."contacts"("tenantId", "rut");

-- CreateIndex
CREATE INDEX "staff_contacts_staffId_idx" ON "public"."staff_contacts"("staffId");

-- CreateIndex
CREATE INDEX "staff_contacts_contactId_idx" ON "public"."staff_contacts"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_contacts_staffId_contactId_relationship_key" ON "public"."staff_contacts"("staffId", "contactId", "relationship");

-- CreateIndex
CREATE INDEX "staff_products_staffId_idx" ON "public"."staff_products"("staffId");

-- CreateIndex
CREATE INDEX "staff_products_productId_idx" ON "public"."staff_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_products_staffId_productId_relationship_key" ON "public"."staff_products"("staffId", "productId", "relationship");

-- CreateIndex
CREATE INDEX "product_suppliers_productId_idx" ON "public"."product_suppliers"("productId");

-- CreateIndex
CREATE INDEX "product_suppliers_supplierId_idx" ON "public"."product_suppliers"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "product_suppliers_productId_supplierId_key" ON "public"."product_suppliers"("productId", "supplierId");

-- CreateIndex
CREATE INDEX "product_movements_productId_idx" ON "public"."product_movements"("productId");

-- CreateIndex
CREATE INDEX "product_movements_supplierId_idx" ON "public"."product_movements"("supplierId");

-- CreateIndex
CREATE INDEX "product_movements_tenantId_createdAt_idx" ON "public"."product_movements"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_tenantId_status_idx" ON "public"."transactions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "transactions_tenantId_createdAt_idx" ON "public"."transactions"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_contactId_idx" ON "public"."transactions"("contactId");

-- CreateIndex
CREATE INDEX "transaction_item_modifiers_transactionItemId_idx" ON "public"."transaction_item_modifiers"("transactionItemId");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_idx" ON "public"."purchase_orders"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_orders_tenantId_status_idx" ON "public"."purchase_orders"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_tenantId_orderNumber_key" ON "public"."purchase_orders"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "recipes_productId_idx" ON "public"."recipes"("productId");

-- CreateIndex
CREATE INDEX "recipes_tenantId_isActive_idx" ON "public"."recipes"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipeId_idx" ON "public"."recipe_ingredients"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_ingredients_ingredientId_idx" ON "public"."recipe_ingredients"("ingredientId");

-- CreateIndex
CREATE INDEX "production_batches_tenantId_status_idx" ON "public"."production_batches"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "production_batches_tenantId_batchNumber_key" ON "public"."production_batches"("tenantId", "batchNumber");

-- CreateIndex
CREATE INDEX "ingredient_consumptions_transactionId_idx" ON "public"."ingredient_consumptions"("transactionId");

-- CreateIndex
CREATE INDEX "ingredient_consumptions_productId_idx" ON "public"."ingredient_consumptions"("productId");

-- CreateIndex
CREATE INDEX "ingredient_consumptions_ingredientId_idx" ON "public"."ingredient_consumptions"("ingredientId");

-- CreateIndex
CREATE INDEX "ingredient_consumptions_tenantId_consumedAt_idx" ON "public"."ingredient_consumptions"("tenantId", "consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_records_productId_location_tenantId_key" ON "public"."inventory_records"("productId", "location", "tenantId");

-- CreateIndex
CREATE INDEX "tax_documents_tenantId_status_idx" ON "public"."tax_documents"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_documents_emitterRUT_folio_tenantId_key" ON "public"."tax_documents"("emitterRUT", "folio", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "public"."tenants"("slug");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "public"."audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "public"."audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "shifts_tenantId_staffId_idx" ON "public"."shifts"("tenantId", "staffId");

-- CreateIndex
CREATE INDEX "shifts_specificDate_idx" ON "public"."shifts"("specificDate");

-- CreateIndex
CREATE INDEX "attendances_tenantId_staffId_date_idx" ON "public"."attendances"("tenantId", "staffId", "date");

-- CreateIndex
CREATE INDEX "attendances_date_idx" ON "public"."attendances"("date");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_shiftId_date_key" ON "public"."attendances"("shiftId", "date");

-- CreateIndex
CREATE INDEX "payroll_runs_tenantId_staffId_idx" ON "public"."payroll_runs"("tenantId", "staffId");

-- CreateIndex
CREATE INDEX "payroll_runs_periodStart_periodEnd_idx" ON "public"."payroll_runs"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "pto_requests_tenantId_staffId_idx" ON "public"."pto_requests"("tenantId", "staffId");

-- CreateIndex
CREATE INDEX "pto_requests_status_idx" ON "public"."pto_requests"("status");

-- CreateIndex
CREATE INDEX "tasks_tenantId_idx" ON "public"."tasks"("tenantId");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "public"."tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_dueDate_idx" ON "public"."tasks"("dueDate");

-- CreateIndex
CREATE INDEX "tasks_createdById_idx" ON "public"."tasks"("createdById");

-- CreateIndex
CREATE INDEX "tasks_googleTaskId_idx" ON "public"."tasks"("googleTaskId");

-- CreateIndex
CREATE INDEX "tasks_syncStatus_idx" ON "public"."tasks"("syncStatus");

-- CreateIndex
CREATE INDEX "task_assignments_staffId_idx" ON "public"."task_assignments"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignments_taskId_staffId_key" ON "public"."task_assignments"("taskId", "staffId");

-- CreateIndex
CREATE INDEX "task_comments_taskId_idx" ON "public"."task_comments"("taskId");

-- CreateIndex
CREATE INDEX "task_comments_staffId_idx" ON "public"."task_comments"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "public"."api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_tenantId_idx" ON "public"."api_keys"("tenantId");

-- CreateIndex
CREATE INDEX "api_keys_key_isActive_idx" ON "public"."api_keys"("key", "isActive");

-- AddForeignKey
ALTER TABLE "public"."staff" ADD CONSTRAINT "staff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_variants" ADD CONSTRAINT "product_variants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."modifier_groups" ADD CONSTRAINT "modifier_groups_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."modifier_groups" ADD CONSTRAINT "modifier_groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_modifiers" ADD CONSTRAINT "product_modifiers_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "public"."modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_modifiers" ADD CONSTRAINT "product_modifiers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contact_type_configs" ADD CONSTRAINT "contact_type_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contact_field_configs" ADD CONSTRAINT "contact_field_configs_contactTypeId_fkey" FOREIGN KEY ("contactTypeId") REFERENCES "public"."contact_type_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contact_field_configs" ADD CONSTRAINT "contact_field_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contacts" ADD CONSTRAINT "contacts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_contacts" ADD CONSTRAINT "staff_contacts_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_contacts" ADD CONSTRAINT "staff_contacts_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_products" ADD CONSTRAINT "staff_products_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_products" ADD CONSTRAINT "staff_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_suppliers" ADD CONSTRAINT "product_suppliers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_suppliers" ADD CONSTRAINT "product_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_movements" ADD CONSTRAINT "product_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_movements" ADD CONSTRAINT "product_movements_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_movements" ADD CONSTRAINT "product_movements_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "public"."staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_movements" ADD CONSTRAINT "product_movements_deliveredById_fkey" FOREIGN KEY ("deliveredById") REFERENCES "public"."staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_movements" ADD CONSTRAINT "product_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transaction_items" ADD CONSTRAINT "transaction_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transaction_items" ADD CONSTRAINT "transaction_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transaction_item_modifiers" ADD CONSTRAINT "transaction_item_modifiers_transactionItemId_fkey" FOREIGN KEY ("transactionItemId") REFERENCES "public"."transaction_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transaction_item_modifiers" ADD CONSTRAINT "transaction_item_modifiers_modifierId_fkey" FOREIGN KEY ("modifierId") REFERENCES "public"."product_modifiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recipes" ADD CONSTRAINT "recipes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recipes" ADD CONSTRAINT "recipes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."production_batches" ADD CONSTRAINT "production_batches_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."production_batches" ADD CONSTRAINT "production_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ingredient_consumptions" ADD CONSTRAINT "ingredient_consumptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ingredient_consumptions" ADD CONSTRAINT "ingredient_consumptions_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ingredient_consumptions" ADD CONSTRAINT "ingredient_consumptions_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_records" ADD CONSTRAINT "inventory_records_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_records" ADD CONSTRAINT "inventory_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tax_documents" ADD CONSTRAINT "tax_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tax_documents" ADD CONSTRAINT "tax_documents_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tax_document_items" ADD CONSTRAINT "tax_document_items_taxDocumentId_fkey" FOREIGN KEY ("taxDocumentId") REFERENCES "public"."tax_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_accounts" ADD CONSTRAINT "payment_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_reimbursements" ADD CONSTRAINT "employee_reimbursements_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_reimbursements" ADD CONSTRAINT "employee_reimbursements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_reimbursements" ADD CONSTRAINT "employee_reimbursements_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "public"."payment_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_categories" ADD CONSTRAINT "expense_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_statuses" ADD CONSTRAINT "expense_statuses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "public"."expense_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_taxDocumentId_fkey" FOREIGN KEY ("taxDocumentId") REFERENCES "public"."tax_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "public"."payment_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_reimbursementId_fkey" FOREIGN KEY ("reimbursementId") REFERENCES "public"."employee_reimbursements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shifts" ADD CONSTRAINT "shifts_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shifts" ADD CONSTRAINT "shifts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendances" ADD CONSTRAINT "attendances_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "public"."shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendances" ADD CONSTRAINT "attendances_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendances" ADD CONSTRAINT "attendances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payroll_runs" ADD CONSTRAINT "payroll_runs_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payroll_runs" ADD CONSTRAINT "payroll_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_requests" ADD CONSTRAINT "pto_requests_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_requests" ADD CONSTRAINT "pto_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_assignments" ADD CONSTRAINT "task_assignments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_assignments" ADD CONSTRAINT "task_assignments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_comments" ADD CONSTRAINT "task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_comments" ADD CONSTRAINT "task_comments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_keys" ADD CONSTRAINT "api_keys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

