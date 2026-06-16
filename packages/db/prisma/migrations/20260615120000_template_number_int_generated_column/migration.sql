-- ============================================================================
-- FlooringTemplate: add a stored generated `templateNumberInt` column that
-- exposes the numeric tail of `template_number` as a true Postgres integer.
--
-- Why: `template_number` is an unpadded string (TP-1, TP-2, ..., TP-211), so a
-- lex sort diverges from numeric order ("TP-10" < "TP-2" lexically). This
-- column gives a true integer for the record-view stepper to walk prev/next by
-- template number. GENERATED ALWAYS STORED from the existing string, so the
-- string remains the source of truth and the int is automatically populated on
-- insert for every row — no backfill, no worker change, zero drift.
--
-- The substring offset `FROM 4` assumes the prefix is exactly "TP-" (3 chars).
-- The prefix is fixed by product decision and not subject to change.
--
-- An index on the new column backs the stepper neighbor lookups
-- (`WHERE "templateNumberInt" < ?/> ? ORDER BY "templateNumberInt"`).
-- ============================================================================

ALTER TABLE "flooring_template"
  ADD COLUMN "templateNumberInt" INTEGER
  GENERATED ALWAYS AS (CAST(SUBSTRING("template_number" FROM 4) AS INTEGER)) STORED;

CREATE INDEX "flooring_template_templateNumberInt_idx"
  ON "flooring_template" ("templateNumberInt");
