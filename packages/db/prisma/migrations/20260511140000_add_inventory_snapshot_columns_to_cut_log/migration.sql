-- =====================================================================
-- Add parent-inventory snapshot columns to flooring_cut_log.
--
-- Joins the existing `inventoryItem` + `location` snapshots so the cut
-- log is fully self-describing without joining FlooringInventory.
-- Columns mirror the parent FlooringInventory fields:
--   - inventoryNumber  (parent: String, dbgenerated INV-#####)
--   - rollPrefix       (parent: String, default 'ROLL#')
--   - rollNumber       (parent: String?)
--   - dyeLot           (parent: String?)
--   - inventoryNote    (parent: `note` String?, renamed to avoid clash
--                       with cut log's own `notes` field)
--
-- All nullable to avoid a backfill — historical cut logs read NULL.
-- The create / update / finalize use cases stamp each column from the
-- parent inventory row going forward.
-- =====================================================================

ALTER TABLE "flooring_cut_log"
  ADD COLUMN "inventoryNumber" TEXT,
  ADD COLUMN "rollPrefix"      TEXT,
  ADD COLUMN "rollNumber"      TEXT,
  ADD COLUMN "dyeLot"          TEXT,
  ADD COLUMN "inventoryNote"   TEXT;
