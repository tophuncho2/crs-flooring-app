CREATE TYPE "FlooringAllocationMethod" AS ENUM ('MANUAL', 'AUTO');
CREATE TYPE "FlooringWorkOrderAllocationRunStatus" AS ENUM ('REQUESTED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

ALTER TABLE "flooring_inventory"
ADD COLUMN "reservedStockCount" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "flooring_work_order_item_allocation" (
  "id" TEXT NOT NULL,
  "workOrderItemId" TEXT NOT NULL,
  "inventoryId" TEXT NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL,
  "cutSize" TEXT,
  "unitCost" DECIMAL(10,4) NOT NULL,
  "method" "FlooringAllocationMethod" NOT NULL DEFAULT 'MANUAL',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "flooring_work_order_item_allocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "flooring_work_order_allocation_run" (
  "id" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "sourceVersion" TIMESTAMP(3) NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" "FlooringWorkOrderAllocationRunStatus" NOT NULL DEFAULT 'REQUESTED',
  "requestId" TEXT,
  "queueJobId" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "queuedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "allocatedRowCount" INTEGER NOT NULL DEFAULT 0,
  "shortageCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "flooring_work_order_allocation_run_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "flooring_work_order_allocation_run_idempotencyKey_key" ON "flooring_work_order_allocation_run"("idempotencyKey");
CREATE INDEX "flooring_work_order_item_allocation_workOrderItemId_idx" ON "flooring_work_order_item_allocation"("workOrderItemId");
CREATE INDEX "flooring_work_order_item_allocation_inventoryId_idx" ON "flooring_work_order_item_allocation"("inventoryId");
CREATE INDEX "flooring_work_order_item_allocation_method_idx" ON "flooring_work_order_item_allocation"("method");
CREATE INDEX "flooring_work_order_allocation_run_workOrderId_requestedAt_idx" ON "flooring_work_order_allocation_run"("workOrderId", "requestedAt");
CREATE INDEX "flooring_work_order_allocation_run_status_requestedAt_idx" ON "flooring_work_order_allocation_run"("status", "requestedAt");

ALTER TABLE "flooring_work_order_item_allocation"
ADD CONSTRAINT "flooring_work_order_item_allocation_workOrderItemId_fkey"
FOREIGN KEY ("workOrderItemId") REFERENCES "flooring_work_order_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "flooring_work_order_item_allocation"
ADD CONSTRAINT "flooring_work_order_item_allocation_inventoryId_fkey"
FOREIGN KEY ("inventoryId") REFERENCES "flooring_inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "flooring_work_order_allocation_run"
ADD CONSTRAINT "flooring_work_order_allocation_run_workOrderId_fkey"
FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "flooring_work_order_allocation_run"
ADD CONSTRAINT "flooring_work_order_allocation_run_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "flooring_work_order_item_allocation" (
  "id",
  "workOrderItemId",
  "inventoryId",
  "quantity",
  "cutSize",
  "unitCost",
  "method",
  "notes",
  "createdAt",
  "updatedAt"
)
SELECT
  'migrated-allocation-' || item."id",
  item."id",
  item."linkedInventoryId",
  item."quantity",
  NULL,
  CASE
    WHEN inventory."stockCount" IS NULL OR inventory."stockCount" = 0 THEN 0
    ELSE ROUND((COALESCE(inventory."cost", 0) + COALESCE(inventory."freight", 0)) / inventory."stockCount", 4)
  END,
  'MANUAL'::"FlooringAllocationMethod",
  'Migrated from direct inventory link',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "flooring_work_order_item" item
JOIN "flooring_inventory" inventory
  ON inventory."id" = item."linkedInventoryId"
WHERE item."linkedInventoryId" IS NOT NULL;

UPDATE "flooring_inventory" inventory
SET "reservedStockCount" = COALESCE(reserved."reservedQuantity", 0)
FROM (
  SELECT "inventoryId", SUM("quantity") AS "reservedQuantity"
  FROM "flooring_work_order_item_allocation"
  GROUP BY "inventoryId"
) reserved
WHERE inventory."id" = reserved."inventoryId";

DROP INDEX IF EXISTS "flooring_work_order_item_linkedInventoryId_idx";
DROP INDEX IF EXISTS "flooring_work_order_item_linkedInventoryId_key";

ALTER TABLE "flooring_work_order_item"
DROP CONSTRAINT IF EXISTS "flooring_work_order_item_linkedInventoryId_fkey";

ALTER TABLE "flooring_work_order_item"
DROP COLUMN "linkedInventoryId";
