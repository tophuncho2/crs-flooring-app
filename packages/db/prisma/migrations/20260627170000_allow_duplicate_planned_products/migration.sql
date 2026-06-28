-- =====================================================================
-- Allow duplicate products across Planned Imports (filter rows).
--
-- One product may now appear on multiple filter rows within a single
-- import; the Staged Inventory view collapses them into one product group
-- whose Requested = the SUM of those rows' stockOrdered. The old
-- one-product-per-import rule is dropped here at the DB and removed from
-- the domain diff validator in the same change-set.
-- =====================================================================

-- Prisma shortens long index names with its own algorithm (not raw Postgres
-- 63-char truncation), so the live unique index is named ..._importEntryId_p_key
-- (verified against the DB), NOT the ..._productId_key literal in the original
-- CREATE migration file.
DROP INDEX "flooring_import_staged_inventory_filter_row_importEntryId_p_key";
