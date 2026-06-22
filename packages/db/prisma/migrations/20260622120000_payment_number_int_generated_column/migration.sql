-- ============================================================================
-- FlooringPayment: add a stored generated `paymentNumberInt` column that
-- exposes the numeric tail of `paymentNumber` as a true Postgres integer.
--
-- Why: `paymentNumber` is a human-readable `PAY-N` string. Lex sort on the
-- string diverges from numeric order ("PAY-10" < "PAY-2" lexically), so the
-- record-view stepper + any number search need a real integer to walk/match
-- the global payment-number line. GENERATED ALWAYS ... STORED keeps the string
-- as the source of truth and auto-populates the int on every insert — no
-- backfill (the table has no non-test rows), no worker change, zero drift risk.
--
-- The substring offset `FROM 5` assumes the prefix is exactly "PAY-" (4 chars).
-- NOTE: the `paymentNumber` column has no @map, so its real name is camelCase
-- and MUST be double-quoted — an unquoted identifier folds to lowercase.
--
-- An index on the new column backs the stepper neighbor lookups
-- (largest int < current / smallest int > current) and exact-number search.
-- ============================================================================

ALTER TABLE "flooring_payment"
  ADD COLUMN "paymentNumberInt" INTEGER
  GENERATED ALWAYS AS (CAST(SUBSTRING("paymentNumber" FROM 5) AS INTEGER)) STORED;

CREATE INDEX "flooring_payment_paymentNumberInt_idx"
  ON "flooring_payment" ("paymentNumberInt");
