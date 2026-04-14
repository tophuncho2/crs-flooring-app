ALTER TABLE "flooring_work_order_item"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "flooring_work_order_service_item"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "flooring_work_order_sales_rep"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "app_mutation_receipt" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "responseStatus" INTEGER,
  "responseBodyJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "app_mutation_receipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "app_mutation_receipt_scope_userId_idempotencyKey_key"
ON "app_mutation_receipt"("scope", "userId", "idempotencyKey");

CREATE INDEX "app_mutation_receipt_userId_idx"
ON "app_mutation_receipt"("userId");

CREATE INDEX "app_mutation_receipt_expiresAt_idx"
ON "app_mutation_receipt"("expiresAt");

ALTER TABLE "app_mutation_receipt"
ADD CONSTRAINT "app_mutation_receipt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
