-- =====================================================================
-- FlooringInventory text-column sweep (mirrors the work-order / template
-- sweeps in 20260513130000, 20260514120000, 20260514130000, and the
-- imports / staged-inventory-row sweep in 20260514170000):
--
--   FlooringInventory (flooring_inventory):
--     1. rollNumber    : text         -> VARCHAR(30)
--     2. dyeLot        : text         -> VARCHAR(30)
--     3. note          : text         -> VARCHAR(30)
--     4. location      : text         -> VARCHAR(30)
--     5. internalNotes : VARCHAR(80)  -> VARCHAR(250) (widen)
--
-- Worker passthrough: materialize-imported-rows.ts copies staged rows
-- into inventory verbatim for rollNumber/dyeLot/note/location, and
-- always seeds internalNotes = NULL. The matching VARCHAR(30) caps on
-- FlooringImportStagedInventoryRow (set in 20260514170000) guarantee
-- the worker cannot produce values that violate the new inventory caps.
--
-- Defense in depth: validators enforce the same caps via shared
-- INVENTORY_*_MAX constants in the next commit.
--
-- Safe bare ALTERs: confirmed by the operator that no rows currently
-- exceed the new caps, so no `USING substring(...)` coercion is needed.
-- The widening on internalNotes is loss-free.
-- =====================================================================

ALTER TABLE "flooring_inventory" ALTER COLUMN "rollNumber"    TYPE VARCHAR(30);
ALTER TABLE "flooring_inventory" ALTER COLUMN "dyeLot"        TYPE VARCHAR(30);
ALTER TABLE "flooring_inventory" ALTER COLUMN "note"          TYPE VARCHAR(30);
ALTER TABLE "flooring_inventory" ALTER COLUMN "location"      TYPE VARCHAR(30);
ALTER TABLE "flooring_inventory" ALTER COLUMN "internalNotes" TYPE VARCHAR(250);
