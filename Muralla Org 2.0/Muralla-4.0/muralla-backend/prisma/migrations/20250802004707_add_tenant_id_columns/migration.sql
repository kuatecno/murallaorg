-- AlterTable
ALTER TABLE "public"."audit_trail" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "public"."documents" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "public"."products" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "public"."roles" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "public"."sales" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "public"."tasks" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "tenantId" TEXT;
