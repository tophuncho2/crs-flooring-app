CREATE TYPE "FlooringWorkOrderItemAllocationStatus" AS ENUM (
  'NOT_STARTED',
  'PARTIALLY_ALLOCATED',
  'FULLY_ALLOCATED',
  'SHORTAGE'
);

ALTER TABLE "flooring_work_order_item"
ADD COLUMN "allocationStatus" "FlooringWorkOrderItemAllocationStatus" NOT NULL DEFAULT 'NOT_STARTED';

UPDATE "flooring_work_order_item" AS item
SET "allocationStatus" = CASE
  WHEN COALESCE((
    SELECT SUM(allocation."quantity")
    FROM "flooring_work_order_item_allocation" AS allocation
    WHERE allocation."workOrderItemId" = item."id"
  ), 0) >= item."quantity" THEN 'FULLY_ALLOCATED'::"FlooringWorkOrderItemAllocationStatus"
  WHEN item."changeOrderStatus" = 'SHORTAGE' THEN 'SHORTAGE'::"FlooringWorkOrderItemAllocationStatus"
  WHEN COALESCE((
    SELECT SUM(allocation."quantity")
    FROM "flooring_work_order_item_allocation" AS allocation
    WHERE allocation."workOrderItemId" = item."id"
  ), 0) > 0 THEN 'PARTIALLY_ALLOCATED'::"FlooringWorkOrderItemAllocationStatus"
  ELSE 'NOT_STARTED'::"FlooringWorkOrderItemAllocationStatus"
END;

CREATE INDEX "flooring_work_order_item_workOrderId_allocationStatus_idx"
ON "flooring_work_order_item"("workOrderId", "allocationStatus");
