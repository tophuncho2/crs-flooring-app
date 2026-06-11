-- =====================================================================
-- Add `wasMerged` status flag to flooring_inventory.
--
-- Set true on every source row consolidated by the inventory "merge" use
-- case (all sources flagged in the same transaction as the new merged
-- row is inserted). Status only — merged rows stay fully editable; a
-- future sweep that drops inventory delete restrictions is how operators
-- clean them up. NOT NULL DEFAULT false backfills existing rows to "not
-- merged" with no separate backfill step.
-- =====================================================================

-- AlterTable
ALTER TABLE "flooring_inventory"
  ADD COLUMN "wasMerged" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "flooring_inventory_wasMerged_idx" ON "flooring_inventory"("wasMerged");
