-- =====================================================================
-- Item unit FKs — EXPAND (non-destructive, safe for all shared-dev branches)
--
-- Sub-plan 2C of the UoM FK epic. Adds a `unitId` FK to the two remaining
-- models still on frozen unit-snapshot strings: template items and work-order
-- items. Both arrive NULLABLE and STAY nullable (mirroring their nullable
-- `quantity`) — the unit is editable and seeded from the product, so there is
-- no NOT NULL flip in 2C (unlike inventory/adjustment in 2B).
--
-- Snapshot columns (sendUnit*) are KEPT as the fallback and dropped in Phase C
-- (post-main). Run after `backfill-item-units.js --apply` reports zero
-- unresolved. FK/index naming matches history:
-- {table}_{col}_fkey / {table}_{col}_idx, ON DELETE RESTRICT ON UPDATE CASCADE.
-- =====================================================================

-- AlterTable
ALTER TABLE "flooring_template_item" ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "flooring_work_order_item" ADD COLUMN     "unitId" TEXT;

-- CreateIndex
CREATE INDEX "flooring_template_item_unitId_idx" ON "flooring_template_item"("unitId");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_unitId_idx" ON "flooring_work_order_item"("unitId");

-- AddForeignKey
ALTER TABLE "flooring_template_item" ADD CONSTRAINT "flooring_template_item_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_item" ADD CONSTRAINT "flooring_work_order_item_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
