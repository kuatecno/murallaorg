-- CreateEnum
CREATE TYPE "public"."PTOStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."pto_requests" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalDays" DECIMAL(5,2) NOT NULL,
    "status" "public"."PTOStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "tenantId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pto_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pto_balances" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalDays" DECIMAL(5,2) NOT NULL,
    "usedDays" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "carryOverDays" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tenantId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pto_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pto_requests_employeeId_idx" ON "public"."pto_requests"("employeeId");

-- CreateIndex
CREATE INDEX "pto_requests_status_idx" ON "public"."pto_requests"("status");

-- CreateIndex
CREATE INDEX "pto_requests_startDate_endDate_idx" ON "public"."pto_requests"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "pto_balances_employeeId_key" ON "public"."pto_balances"("employeeId");

-- CreateIndex
CREATE INDEX "pto_balances_year_idx" ON "public"."pto_balances"("year");

-- CreateIndex
CREATE UNIQUE INDEX "pto_balances_employeeId_year_key" ON "public"."pto_balances"("employeeId", "year");

-- AddForeignKey
ALTER TABLE "public"."pto_requests" ADD CONSTRAINT "pto_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_requests" ADD CONSTRAINT "pto_requests_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_balances" ADD CONSTRAINT "pto_balances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
