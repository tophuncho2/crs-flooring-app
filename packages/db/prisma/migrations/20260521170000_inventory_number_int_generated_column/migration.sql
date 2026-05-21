-- ============================================================================
-- FlooringInventory: add a stored generated `inventoryNumberInt` column that
-- exposes the numeric tail of `inventoryNumber` as a true Postgres integer.
--
-- Why: after the 2026-05-21 unpad migration, `inventoryNumber` is no longer
-- zero-padded (e.g. INV-1, INV-2, ..., INV-211). Lex sort on the string then
-- diverges from numeric order ("INV-10" < "INV-2" lexically), which broke
-- "oldest first" on the inventory list view. This column is GENERATED ALWAYS
-- STORED from the existing string, so the string remains the source of truth
-- and the int is automatically populated on insert for every row — no
-- backfill needed, no worker code change, zero drift risk.
--
-- The substring offset `FROM 5` assumes the prefix is exactly "INV-" (4
-- chars). The prefix is fixed by product decision and not subject to change.
--
-- An index on the new column backs the list view + picker sort
-- (`ORDER BY "inventoryNumberInt" ASC, "id" ASC`).
-- ============================================================================

ALTER TABLE "flooring_inventory"
  ADD COLUMN "inventoryNumberInt" INTEGER
  GENERATED ALWAYS AS (CAST(SUBSTRING("inventory_number" FROM 5) AS INTEGER)) STORED;

CREATE INDEX "flooring_inventory_inventoryNumberInt_idx"
  ON "flooring_inventory" ("inventoryNumberInt");
