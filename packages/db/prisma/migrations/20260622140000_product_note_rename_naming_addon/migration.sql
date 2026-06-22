-- ============================================================================
-- FlooringProduct: rename `note` → `productNamingAddon`.
--
-- Why: this column is NOT a free-text memo (the meaning every other note/notes
-- field in the schema carries). It holds an operator-supplied string folded — as
-- the last segment — into the product's stored display name
-- (category - style - color - <this>), via buildStoredFlooringProductName. The
-- rename makes the field self-describing. Pure, non-behavioral — column data and
-- the name-building logic are unchanged.
-- ============================================================================

ALTER TABLE "flooring_product" RENAME COLUMN "note" TO "productNamingAddon";
