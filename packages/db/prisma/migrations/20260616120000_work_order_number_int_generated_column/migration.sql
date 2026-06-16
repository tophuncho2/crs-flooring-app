-- ============================================================================
-- FlooringWorkOrder: add a stored generated `workOrderNumberInt` column that
-- exposes the numeric tail of `work_order_number` as a true Postgres integer.
--
-- Why: `work_order_number` is an unpadded string (WO-1, WO-2, ..., WO-211), so a
-- lex sort diverges from numeric order ("WO-10" < "WO-2" lexically). This
-- column gives a true integer for the record-view stepper to walk prev/next by
-- work-order number. GENERATED ALWAYS STORED from the existing string, so the
-- string remains the source of truth and the int is automatically populated on
-- insert for every row — no backfill, no worker change, zero drift.
--
-- The substring offset `FROM 4` assumes the prefix is exactly "WO-" (3 chars).
-- The prefix is fixed by product decision and not subject to change. Mirrors the
-- template `templateNumberInt` column (TP- prefix, also FROM 4).
--
-- An index on the new column backs the stepper neighbor lookups
-- (`WHERE "workOrderNumberInt" < ?/> ? ORDER BY "workOrderNumberInt"`).
-- ============================================================================

ALTER TABLE "flooring_work_order"
  ADD COLUMN "workOrderNumberInt" INTEGER
  GENERATED ALWAYS AS (CAST(SUBSTRING("work_order_number" FROM 4) AS INTEGER)) STORED;

CREATE INDEX "flooring_work_order_workOrderNumberInt_idx"
  ON "flooring_work_order" ("workOrderNumberInt");
