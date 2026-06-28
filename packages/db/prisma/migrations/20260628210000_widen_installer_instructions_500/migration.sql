-- =====================================================================
-- Widen installerInstructions 250 -> 500 on both work orders and templates.
--
-- Increasing a VARCHAR length is metadata-only in Postgres: no table
-- rewrite, no USING clause, no data coercion. Existing rows are untouched.
-- =====================================================================

ALTER TABLE "flooring_work_order"
  ALTER COLUMN "installerInstructions" TYPE VARCHAR(500);

ALTER TABLE "flooring_template"
  ALTER COLUMN "installerInstructions" TYPE VARCHAR(500);
