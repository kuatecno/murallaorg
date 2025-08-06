/*
  Warnings:

  - The `permissions` column on the `roles` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."roles" DROP COLUMN "permissions",
ADD COLUMN     "permissions" TEXT[];
