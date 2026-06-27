-- =====================================================================
-- De-link FlooringImportStagedInventoryRow from its filter row.
--
-- Staged rows now attach to the import entry directly and carry their own
-- productId + stockUnit snapshots (both already present). Grouping by
-- filterRowId becomes a computed grouping by productId, so the FK + its
-- indexes are dropped. No data backfill needed — only the grouping link
-- is lost.
--
-- Drop order: FK constraint → its indexes → the column.
-- =====================================================================

ALTER TABLE "flooring_import_staged_inventory_row"
  DROP CONSTRAINT "flooring_import_staged_inventory_row_filterRowId_fkey";

DROP INDEX "flooring_import_staged_inventory_row_filterRowId_idx";
DROP INDEX "flooring_import_staged_inventory_row_filterRowId_status_idx";

ALTER TABLE "flooring_import_staged_inventory_row"
  DROP COLUMN "filterRowId";
