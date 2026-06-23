-- FlooringInventoryAdjustment: two STORED generated integer columns.
--
-- `adjustmentNumberInt`  — derived from `adjustmentNumber` ('ADJ-' prefix, 4
--                          chars → SUBSTRING FROM 5). Powers the new exact Adj #
--                          list search + the per-parent record-view stepper.
-- `inventoryNumberInt`   — derived from the frozen snapshot `inventoryNumber`
--                          ('INV-' prefix, 4 chars → SUBSTRING FROM 5). Flips the
--                          Inv # search from substring ILIKE to exact btree match,
--                          mirroring the inventory list.
--
-- Both are GENERATED ALWAYS STORED, so they auto-populate for every existing row
-- at ALTER time wherever the source string is non-null (legacy rows with a NULL
-- `inventoryNumber` snapshot get a NULL int — backfilled by a later migration).
-- The btree indexes back the exact-equality searches and the stepper neighbor
-- keyset is chronological, not numeric, so it does not use these.
-- ============================================================================

ALTER TABLE "flooring_inventory_adjustment"
  ADD COLUMN "adjustmentNumberInt" INTEGER
  GENERATED ALWAYS AS (CAST(SUBSTRING("adjustmentNumber" FROM 5) AS INTEGER)) STORED;

ALTER TABLE "flooring_inventory_adjustment"
  ADD COLUMN "inventoryNumberInt" INTEGER
  GENERATED ALWAYS AS (CAST(SUBSTRING("inventoryNumber" FROM 5) AS INTEGER)) STORED;

CREATE INDEX "flooring_inventory_adjustment_adjustmentNumberInt_idx" ON "flooring_inventory_adjustment" ("adjustmentNumberInt");

CREATE INDEX "flooring_inventory_adjustment_inventoryNumberInt_idx" ON "flooring_inventory_adjustment" ("inventoryNumberInt");

-- Inv # is now an exact integer match, so the snapshot string no longer needs a
-- trigram index. roll#/dye/note keep theirs (still substring ILIKE).
DROP INDEX "flooring_inventory_adjustment_inventoryNumber_trgm_idx";
