-- =====================================================================
-- Row unit FKs — EXPAND (non-destructive, safe for all shared-dev branches)
--
-- Sub-plan 2B of the UoM FK epic. Adds a `unitId` FK to inventory, adjustment,
-- and both staged models. All arrive NULLABLE so this deploys before the
-- backfill; inventory + adjustment are flipped to NOT NULL in the separate
-- `_row_units_not_null` migration after `backfill-row-units.js --apply` reports
-- zero unresolved. Staged + filter `unitId` stay nullable (editable in staging).
--
-- Snapshot columns (stockUnit*/sendUnit*) are KEPT as the fallback and dropped
-- in Phase C (post-main). FK/index naming matches history:
-- {table}_{col}_fkey / {table}_{col}_idx, ON DELETE RESTRICT ON UPDATE CASCADE.
-- =====================================================================

-- AlterTable
ALTER TABLE "flooring_inventory" ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "flooring_inventory_adjustment" ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "flooring_import_staged_inventory_row" ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "flooring_import_staged_inventory_filter_row" ADD COLUMN     "unitId" TEXT;

-- CreateIndex
CREATE INDEX "flooring_inventory_unitId_idx" ON "flooring_inventory"("unitId");

-- CreateIndex
CREATE INDEX "flooring_inventory_adjustment_unitId_idx" ON "flooring_inventory_adjustment"("unitId");

-- CreateIndex
CREATE INDEX "flooring_import_staged_inventory_row_unitId_idx" ON "flooring_import_staged_inventory_row"("unitId");

-- CreateIndex
CREATE INDEX "flooring_import_staged_inventory_filter_row_unitId_idx" ON "flooring_import_staged_inventory_filter_row"("unitId");

-- AddForeignKey
ALTER TABLE "flooring_inventory" ADD CONSTRAINT "flooring_inventory_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_inventory_adjustment" ADD CONSTRAINT "flooring_inventory_adjustment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_import_staged_inventory_row" ADD CONSTRAINT "flooring_import_staged_inventory_row_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_import_staged_inventory_filter_row" ADD CONSTRAINT "flooring_import_staged_inventory_filter_row_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
