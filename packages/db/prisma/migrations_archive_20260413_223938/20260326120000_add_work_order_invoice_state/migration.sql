CREATE TYPE "FlooringInvoiceStatus" AS ENUM ('IDLE', 'QUEUED', 'PROCESSING', 'READY', 'FAILED');

ALTER TABLE "flooring_work_order"
ADD COLUMN "invoiceSourceUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "invoiceStatus" "FlooringInvoiceStatus" NOT NULL DEFAULT 'IDLE',
ADD COLUMN "invoiceFileKey" TEXT,
ADD COLUMN "invoiceRequestedAt" TIMESTAMP(3),
ADD COLUMN "invoiceGeneratedAt" TIMESTAMP(3),
ADD COLUMN "invoiceFailedAt" TIMESTAMP(3),
ADD COLUMN "invoiceError" TEXT,
ADD COLUMN "invoiceIdempotencyKey" TEXT;

CREATE INDEX "flooring_work_order_invoiceStatus_idx" ON "flooring_work_order"("invoiceStatus");
CREATE INDEX "flooring_work_order_invoiceIdempotencyKey_idx" ON "flooring_work_order"("invoiceIdempotencyKey");
