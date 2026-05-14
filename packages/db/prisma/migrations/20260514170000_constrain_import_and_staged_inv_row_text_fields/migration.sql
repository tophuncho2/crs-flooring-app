-- =====================================================================
-- FlooringImportEntry + FlooringImportStagedInventoryRow text-column
-- sweep (mirrors the work-order / template sweeps in 20260513130000,
-- 20260514120000, and 20260514130000):
--
--   FlooringImportEntry (flooring_import_entry):
--     1. purchaseOrderNumber : text         -> VARCHAR(50)  (narrow)
--     2. internalNotes       : VARCHAR(80)  -> VARCHAR(250) (widen)
--
--   FlooringImportStagedInventoryRow (flooring_import_staged_inventory_row):
--     3. rollNumber : text -> VARCHAR(30)
--     4. dyeLot     : text -> VARCHAR(30)
--     5. location   : text -> VARCHAR(30)
--     6. note       : text -> VARCHAR(30)
--
-- Defense in depth: validators enforce the same caps via shared
-- IMPORT_*_MAX / STAGED_INVENTORY_ROW_*_MAX constants in the next commit.
--
-- Safe bare ALTERs: confirmed by the operator that no rows currently
-- exceed the new caps, so no `USING substring(...)` coercion is needed.
-- The widening on internalNotes is loss-free.
-- =====================================================================

ALTER TABLE "flooring_import_entry" ALTER COLUMN "purchaseOrderNumber" TYPE VARCHAR(50);
ALTER TABLE "flooring_import_entry" ALTER COLUMN "internalNotes"       TYPE VARCHAR(250);

ALTER TABLE "flooring_import_staged_inventory_row" ALTER COLUMN "rollNumber" TYPE VARCHAR(30);
ALTER TABLE "flooring_import_staged_inventory_row" ALTER COLUMN "dyeLot"     TYPE VARCHAR(30);
ALTER TABLE "flooring_import_staged_inventory_row" ALTER COLUMN "location"   TYPE VARCHAR(30);
ALTER TABLE "flooring_import_staged_inventory_row" ALTER COLUMN "note"       TYPE VARCHAR(30);
