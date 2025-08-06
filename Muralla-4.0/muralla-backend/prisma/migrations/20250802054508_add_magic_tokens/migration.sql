-- CreateTable
CREATE TABLE "public"."magic_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "magic_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "magic_tokens_tokenHash_idx" ON "public"."magic_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "magic_tokens_userId_idx" ON "public"."magic_tokens"("userId");

-- CreateIndex
CREATE INDEX "magic_tokens_expiresAt_idx" ON "public"."magic_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."magic_tokens" ADD CONSTRAINT "magic_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
