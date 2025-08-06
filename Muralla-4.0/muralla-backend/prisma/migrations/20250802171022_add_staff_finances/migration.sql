-- CreateEnum
CREATE TYPE "public"."PayrollStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."SalaryAdjustmentType" AS ENUM ('SALARY_INCREASE', 'SALARY_DECREASE', 'BONUS', 'ALLOWANCE_CHANGE', 'PROMOTION', 'DEMOTION', 'ANNUAL_REVIEW');

-- CreateEnum
CREATE TYPE "public"."ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "payrollId" TEXT;

-- CreateTable
CREATE TABLE "public"."payrolls" (
    "id" TEXT NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL,
    "payPeriodStart" TIMESTAMP(3) NOT NULL,
    "payPeriodEnd" TIMESTAMP(3) NOT NULL,
    "status" "public"."PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "totalGrossPay" DECIMAL(12,2) NOT NULL,
    "totalDeductions" DECIMAL(12,2) NOT NULL,
    "totalNetPay" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "tenantId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payroll_entries" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "baseSalary" DECIMAL(10,2) NOT NULL,
    "hoursWorked" DECIMAL(5,2),
    "overtimeHours" DECIMAL(5,2),
    "bonusAmount" DECIMAL(10,2),
    "allowances" DECIMAL(10,2),
    "grossPay" DECIMAL(10,2) NOT NULL,
    "taxDeductions" DECIMAL(10,2) NOT NULL,
    "socialSecurity" DECIMAL(10,2) NOT NULL,
    "otherDeductions" DECIMAL(10,2),
    "netPay" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "tenantId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."salary_adjustments" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "adjustmentType" "public"."SalaryAdjustmentType" NOT NULL,
    "previousAmount" DECIMAL(10,2) NOT NULL,
    "newAmount" DECIMAL(10,2) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "tenantId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_expenses" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "receiptUrl" TEXT,
    "status" "public"."ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reimbursedAt" TIMESTAMP(3),
    "reimbursementTransactionId" TEXT,
    "notes" TEXT,
    "tenantId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payrolls_runDate_idx" ON "public"."payrolls"("runDate");

-- CreateIndex
CREATE INDEX "payrolls_status_idx" ON "public"."payrolls"("status");

-- CreateIndex
CREATE INDEX "payrolls_payPeriodStart_payPeriodEnd_idx" ON "public"."payrolls"("payPeriodStart", "payPeriodEnd");

-- CreateIndex
CREATE INDEX "payroll_entries_payrollId_idx" ON "public"."payroll_entries"("payrollId");

-- CreateIndex
CREATE INDEX "payroll_entries_employeeId_idx" ON "public"."payroll_entries"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_entries_payrollId_employeeId_key" ON "public"."payroll_entries"("payrollId", "employeeId");

-- CreateIndex
CREATE INDEX "salary_adjustments_employeeId_idx" ON "public"."salary_adjustments"("employeeId");

-- CreateIndex
CREATE INDEX "salary_adjustments_effectiveDate_idx" ON "public"."salary_adjustments"("effectiveDate");

-- CreateIndex
CREATE INDEX "salary_adjustments_adjustmentType_idx" ON "public"."salary_adjustments"("adjustmentType");

-- CreateIndex
CREATE UNIQUE INDEX "employee_expenses_reimbursementTransactionId_key" ON "public"."employee_expenses"("reimbursementTransactionId");

-- CreateIndex
CREATE INDEX "employee_expenses_employeeId_idx" ON "public"."employee_expenses"("employeeId");

-- CreateIndex
CREATE INDEX "employee_expenses_status_idx" ON "public"."employee_expenses"("status");

-- CreateIndex
CREATE INDEX "employee_expenses_expenseDate_idx" ON "public"."employee_expenses"("expenseDate");

-- CreateIndex
CREATE INDEX "employee_expenses_category_idx" ON "public"."employee_expenses"("category");

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "public"."payrolls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payrolls" ADD CONSTRAINT "payrolls_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payrolls" ADD CONSTRAINT "payrolls_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payroll_entries" ADD CONSTRAINT "payroll_entries_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "public"."payrolls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payroll_entries" ADD CONSTRAINT "payroll_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."salary_adjustments" ADD CONSTRAINT "salary_adjustments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."salary_adjustments" ADD CONSTRAINT "salary_adjustments_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_expenses" ADD CONSTRAINT "employee_expenses_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_expenses" ADD CONSTRAINT "employee_expenses_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_expenses" ADD CONSTRAINT "employee_expenses_reimbursementTransactionId_fkey" FOREIGN KEY ("reimbursementTransactionId") REFERENCES "public"."transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
