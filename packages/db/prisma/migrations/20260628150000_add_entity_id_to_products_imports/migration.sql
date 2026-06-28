-- =====================================================================
-- Entity Payments — expand phase: link products + imports to Entity.
--
-- Manufacturers are being folded into the unified `entity` model (Entity
-- Payments epic). This migration adds the nullable `entityId` FK to
-- `flooring_product` and `flooring_import_entry`, alongside the still-live
-- `manufacturerId`. Purely ADDITIVE — both columns coexist during the
-- transition.
--
--   • Nullable FK, ON DELETE SET NULL — mirrors the existing manufacturerId
--     behavior (deleting an entity orphans the link, never the row).
--   • Btree index on each entityId for the FK lookup.
--
-- A separate backfill script (run per-env, after this is applied) copies
-- manufacturerId → entityId. The DROP of manufacturerId / FlooringManufacturer
-- is a deliberately SEPARATE, later migration, gated on that backfill being
-- verified in every environment. Do not bundle the drop here.
-- =====================================================================

-- AlterTable
ALTER TABLE "flooring_product" ADD COLUMN "entityId" TEXT;

-- AlterTable
ALTER TABLE "flooring_import_entry" ADD COLUMN "entityId" TEXT;

-- CreateIndex
CREATE INDEX "flooring_product_entityId_idx" ON "flooring_product"("entityId");

-- CreateIndex
CREATE INDEX "flooring_import_entry_entityId_idx" ON "flooring_import_entry"("entityId");

-- AddForeignKey
ALTER TABLE "flooring_product" ADD CONSTRAINT "flooring_product_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_import_entry" ADD CONSTRAINT "flooring_import_entry_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
