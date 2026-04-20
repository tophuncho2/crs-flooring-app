-- Canonical sweep: imports + inventory + cut-logs + work-orders
-- Phase A schema migration

-- Drop allocation tables + runner (auto-allocation deferred; BullMQ queue infra stays)
DROP TABLE IF EXISTS "flooring_work_order_allocation_run";
DROP TABLE IF EXISTS "flooring_work_order_item_allocation";
DROP TYPE IF EXISTS "FlooringWorkOrderAllocationRunStatus";
DROP TYPE IF EXISTS "FlooringAllocationMethod";

-- Drop stored allocation + change-order status columns on work-order items (now computed)
ALTER TABLE "flooring_work_order_item"
  DROP COLUMN IF EXISTS "allocationStatus",
  DROP COLUMN IF EXISTS "changeOrderStatus";
DROP TYPE IF EXISTS "FlooringWorkOrderItemAllocationStatus";
-- Keep FlooringChangeOrderStatus enum — TypeScript type for computed fulfillmentStatus.

-- Inventory: warehouse link + received flag + drop dead reservedStockCount
ALTER TABLE "flooring_inventory"
  ADD COLUMN "warehouseId" TEXT,
  ADD COLUMN "isImported" BOOLEAN NOT NULL DEFAULT false,
  DROP COLUMN IF EXISTS "reservedStockCount",
  ADD CONSTRAINT "flooring_inventory_warehouseId_fkey"
    FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "flooring_inventory_warehouseId_idx" ON "flooring_inventory"("warehouseId");

-- Cut log status (PENDING | FINAL, default PENDING)
ALTER TABLE "flooring_cut_log"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';
