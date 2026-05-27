-- =====================================================================
-- Work Order Status: enum -> user-editable lookup table.
--
-- Adds the `flooring_work_order_status` lookup table (slug + name) and a
-- nullable `flooring_work_order.status_id` FK. A "None" row is seeded
-- here so existing work orders can be backfilled to it; the seed script
-- (seed-work-order-statuses.js) upserts the full set by slug afterward,
-- so this bootstrap row is idempotent.
--
-- Retires two dead enums:
--   * FlooringWorkOrderStatus  — the old flooring_work_order.status column
--     was never written (PDF-worker leftover); dropped + replaced by the
--     statusId FK above.
--   * FlooringChangeOrderStatus — orphaned; referenced by no table/column.
--
-- FlooringWorkOrderItemStatus is intentionally left untouched (live on
-- flooring_work_order_item).
-- =====================================================================

-- CreateTable
CREATE TABLE "flooring_work_order_status" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_work_order_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flooring_work_order_status_slug_key" ON "flooring_work_order_status"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_work_order_status_name_key" ON "flooring_work_order_status"("name");

-- CreateIndex
CREATE INDEX "flooring_work_order_status_name_idx" ON "flooring_work_order_status"("name");

-- Bootstrap the "None" default so existing work orders can be backfilled.
INSERT INTO "flooring_work_order_status" ("id", "slug", "name", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'none', 'None', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "flooring_work_order" ADD COLUMN "status_id" TEXT;

-- Backfill every existing work order to "None".
UPDATE "flooring_work_order"
SET "status_id" = (SELECT "id" FROM "flooring_work_order_status" WHERE "slug" = 'none')
WHERE "status_id" IS NULL;

-- AddForeignKey
ALTER TABLE "flooring_work_order" ADD CONSTRAINT "flooring_work_order_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "flooring_work_order_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "flooring_work_order_status_id_idx" ON "flooring_work_order"("status_id");

-- Drop the dead status column (this also drops its flooring_work_order_status_idx index).
ALTER TABLE "flooring_work_order" DROP COLUMN "status";

-- DropEnum
DROP TYPE "FlooringWorkOrderStatus";

-- DropEnum
DROP TYPE "FlooringChangeOrderStatus";
