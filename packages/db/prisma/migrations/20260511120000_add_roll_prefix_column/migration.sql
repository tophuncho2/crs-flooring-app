-- =====================================================================
-- Add `roll_prefix` column to flooring_inventory and
-- flooring_import_staged_inventory_row.
--
-- Splits the display prefix from the user-typed suffix on rollNumber.
-- Previously the domain layer prepended "ROLL" to `roll_number` on every
-- write, which accumulated across edits (ROLL123 → ROLLROLL123 → ...).
-- After this sweep, `roll_number` stores only the bare suffix; the
-- prefix is rendered from this column at display time.
--
-- Default `'ROLL#'` lets the column be added without a backfill (all
-- existing inventory + staged rows are being truncated in the same
-- sweep, so no data needs migration).
-- =====================================================================

ALTER TABLE "flooring_inventory"
  ADD COLUMN "rollPrefix" TEXT NOT NULL DEFAULT 'ROLL#';

ALTER TABLE "flooring_import_staged_inventory_row"
  ADD COLUMN "rollPrefix" TEXT NOT NULL DEFAULT 'ROLL#';
