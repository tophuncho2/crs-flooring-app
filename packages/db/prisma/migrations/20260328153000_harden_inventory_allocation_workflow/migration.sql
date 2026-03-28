ALTER TYPE "FlooringWorkOrderAllocationRunStatus" ADD VALUE 'SUPERSEDED';

ALTER TABLE "flooring_inventory"
ADD COLUMN "fifoReceivedAt" TIMESTAMP(3);

UPDATE "flooring_inventory" AS inventory
SET "fifoReceivedAt" = COALESCE(import_entry."createdAt", inventory."createdAt")
FROM "flooring_import_entry" AS import_entry
WHERE inventory."importEntryId" = import_entry."id"
  AND inventory."fifoReceivedAt" IS NULL;

UPDATE "flooring_inventory"
SET "fifoReceivedAt" = "createdAt"
WHERE "fifoReceivedAt" IS NULL;

ALTER TABLE "flooring_inventory"
ALTER COLUMN "fifoReceivedAt" SET NOT NULL;

CREATE INDEX "flooring_inventory_productId_fifoReceivedAt_itemNumber_id_idx"
ON "flooring_inventory"("productId", "fifoReceivedAt", "itemNumber", "id");

CREATE INDEX "flooring_work_order_item_allocation_workOrderItemId_createdAt_id_idx"
ON "flooring_work_order_item_allocation"("workOrderItemId", "createdAt", "id");

CREATE INDEX "flooring_work_order_item_allocation_inventoryId_method_idx"
ON "flooring_work_order_item_allocation"("inventoryId", "method");

CREATE UNIQUE INDEX "flooring_work_order_allocation_run_workOrderId_sourceVersion_key"
ON "flooring_work_order_allocation_run"("workOrderId", "sourceVersion");

CREATE INDEX "queue_outbox_event_status_availableAt_lockedAt_createdAt_idx"
ON "queue_outbox_event"("status", "availableAt", "lockedAt", "createdAt");
