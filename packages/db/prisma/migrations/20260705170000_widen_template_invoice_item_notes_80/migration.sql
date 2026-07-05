-- =====================================================================
-- Widen template_invoice_item.notes 30 -> 80.
--
-- Increasing a VARCHAR length is metadata-only in Postgres: no table
-- rewrite, no USING clause, no data coercion. Existing rows are untouched.
-- =====================================================================

ALTER TABLE "template_invoice_item"
  ALTER COLUMN "notes" TYPE VARCHAR(80);
