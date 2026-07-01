-- =====================================================================
-- Product unit FK — EXPAND (non-destructive, safe for all shared-dev branches)
--
-- First step of the UoM FK-migration epic (sub-plan 2A). Adds the product's
-- real unit FK plus a dormant coverage FK. Both arrive NULLABLE so this can
-- deploy before the backfill runs; `unitId` is flipped to NOT NULL in the
-- separate `_product_unit_not_null` migration, only after
-- `backfill-product-unit.js --apply` reports zero unresolved rows.
--
--   • `unitId`          → required end-state (nullable here), FK Restrict.
--   • `coverageUnitId`  → dormant; nullable FK, never written by app code yet.
--
-- Snapshot columns (sendUnit*/stockUnit*) are KEPT as the fallback and are
-- dropped later in Phase C (post-main). FK/index naming matches history:
-- {table}_{col}_fkey / {table}_{col}_idx, ON DELETE RESTRICT ON UPDATE CASCADE.
-- =====================================================================

-- AlterTable
ALTER TABLE "flooring_product" ADD COLUMN     "unitId" TEXT,
ADD COLUMN     "coverageUnitId" TEXT;

-- CreateIndex
CREATE INDEX "flooring_product_unitId_idx" ON "flooring_product"("unitId");

-- CreateIndex
CREATE INDEX "flooring_product_coverageUnitId_idx" ON "flooring_product"("coverageUnitId");

-- AddForeignKey
ALTER TABLE "flooring_product" ADD CONSTRAINT "flooring_product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_product" ADD CONSTRAINT "flooring_product_coverageUnitId_fkey" FOREIGN KEY ("coverageUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
