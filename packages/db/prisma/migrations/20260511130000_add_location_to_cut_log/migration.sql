-- =====================================================================
-- Add `location` column to flooring_cut_log.
--
-- Snapshots the parent FlooringInventory.location at cut time, alongside
-- the existing `inventoryItem` snapshot. Nullable to match the parent
-- column (inventory rows are not required to have a location) and to
-- avoid a backfill — historical cut logs simply read NULL.
-- =====================================================================

ALTER TABLE "flooring_cut_log"
  ADD COLUMN "location" TEXT;
