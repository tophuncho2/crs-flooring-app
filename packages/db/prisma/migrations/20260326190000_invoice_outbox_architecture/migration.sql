CREATE TYPE "FlooringInvoiceGenerationStatus" AS ENUM ('REQUESTED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'SUPERSEDED');
CREATE TYPE "QueueOutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'DISPATCHED', 'EXHAUSTED');

ALTER TABLE "flooring_work_order"
ADD COLUMN "invoiceSourceVersion" TIMESTAMP(3);

UPDATE "flooring_work_order"
SET "invoiceSourceVersion" = COALESCE("invoiceSourceUpdatedAt", CURRENT_TIMESTAMP)
WHERE "invoiceSourceVersion" IS NULL;

ALTER TABLE "flooring_work_order"
ALTER COLUMN "invoiceSourceVersion" SET NOT NULL,
ALTER COLUMN "invoiceSourceVersion" SET DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "flooring_invoice_generation" (
  "id" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "sourceVersion" TIMESTAMP(3) NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" "FlooringInvoiceGenerationStatus" NOT NULL DEFAULT 'REQUESTED',
  "requestId" TEXT,
  "queueJobId" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "queuedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "supersededAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "flooring_invoice_generation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "flooring_invoice_artifact" (
  "id" TEXT NOT NULL,
  "generationId" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "bucketName" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "flooring_invoice_artifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "queue_outbox_event" (
  "id" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "status" "QueueOutboxEventStatus" NOT NULL DEFAULT 'PENDING',
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lockedBy" TEXT,
  "dispatchedAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "queue_outbox_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "flooring_invoice_generation_idempotencyKey_key" ON "flooring_invoice_generation"("idempotencyKey");
CREATE UNIQUE INDEX "flooring_invoice_generation_workOrderId_sourceVersion_key" ON "flooring_invoice_generation"("workOrderId", "sourceVersion");
CREATE INDEX "flooring_invoice_generation_workOrderId_requestedAt_idx" ON "flooring_invoice_generation"("workOrderId", "requestedAt");
CREATE INDEX "flooring_invoice_generation_status_requestedAt_idx" ON "flooring_invoice_generation"("status", "requestedAt");

CREATE UNIQUE INDEX "flooring_invoice_artifact_generationId_key" ON "flooring_invoice_artifact"("generationId");
CREATE INDEX "flooring_invoice_artifact_workOrderId_createdAt_idx" ON "flooring_invoice_artifact"("workOrderId", "createdAt");

CREATE UNIQUE INDEX "queue_outbox_event_idempotencyKey_key" ON "queue_outbox_event"("idempotencyKey");
CREATE INDEX "queue_outbox_event_status_availableAt_idx" ON "queue_outbox_event"("status", "availableAt");
CREATE INDEX "queue_outbox_event_aggregateType_aggregateId_idx" ON "queue_outbox_event"("aggregateType", "aggregateId");

ALTER TABLE "flooring_invoice_generation"
ADD CONSTRAINT "flooring_invoice_generation_workOrderId_fkey"
FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "flooring_invoice_generation"
ADD CONSTRAINT "flooring_invoice_generation_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "flooring_invoice_artifact"
ADD CONSTRAINT "flooring_invoice_artifact_generationId_fkey"
FOREIGN KEY ("generationId") REFERENCES "flooring_invoice_generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "flooring_invoice_artifact"
ADD CONSTRAINT "flooring_invoice_artifact_workOrderId_fkey"
FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "flooring_work_order"
DROP COLUMN "invoiceSourceUpdatedAt",
DROP COLUMN "invoiceStatus",
DROP COLUMN "invoiceFileKey",
DROP COLUMN "invoiceRequestedAt",
DROP COLUMN "invoiceGeneratedAt",
DROP COLUMN "invoiceFailedAt",
DROP COLUMN "invoiceError",
DROP COLUMN "invoiceIdempotencyKey";

DROP TYPE "FlooringInvoiceStatus";
