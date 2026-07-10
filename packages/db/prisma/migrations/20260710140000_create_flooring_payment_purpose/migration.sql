-- =====================================================================
-- Payment Purposes: standalone user-managed lookup model.
--
-- Adds the `flooring_payment_purpose` table — a user-editable lookup with:
--   • `payment_purpose_number`   — human-readable ROW-N, generated from a
--     dedicated sequence (parity with ET-/JT-/PAY-/ADJ-/WO- numbers).
--   • `paymentPurposeNumberInt`  — STORED generated int derived from the ROW-
--     string; powers the record-view stepper + the exact ROW-number list
--     search (btree equality). 'ROW-' is 4 chars, so the substring starts FROM 5.
--   • `name`                     — VARCHAR(30), UNIQUE (one purpose per label);
--     also trgm-GIN indexed for the free-text name search bar.
--   • `color`                    — non-semantic palette tag (shared PaletteColor).
--   • `createdBy`/`updatedBy`    — actor-email columns (nullable, no FK).
--
-- This table stands ALONE — no foreign keys this slice; linking to payments
-- (max 1 per payment) and to planned payments are later steps. The shared
-- "PaletteColor" enum already exists, so no CREATE TYPE here. pg_trgm is already
-- enabled (20260521044911_enable_pg_trgm). The camelCase generated column must
-- be double-quoted (unquoted folds to lowercase).
-- =====================================================================

-- CreateSequence (backs the ROW- payment_purpose_number default)
CREATE SEQUENCE IF NOT EXISTS "flooring_payment_purpose_number_seq";

-- CreateTable
CREATE TABLE "flooring_payment_purpose" (
    "id" TEXT NOT NULL,
    "payment_purpose_number" TEXT NOT NULL DEFAULT ('ROW-'::text || (nextval('flooring_payment_purpose_number_seq'::regclass))::text),
    "name" VARCHAR(30) NOT NULL,
    "color" "PaletteColor" NOT NULL DEFAULT 'SLATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "flooring_payment_purpose_pkey" PRIMARY KEY ("id")
);

-- STORED generated integer derived from `payment_purpose_number` (ROW- is 4 chars → FROM 5)
ALTER TABLE "flooring_payment_purpose"
  ADD COLUMN "paymentPurposeNumberInt" INTEGER
  GENERATED ALWAYS AS (CAST(SUBSTRING("payment_purpose_number" FROM 5) AS INTEGER)) STORED;

-- CreateIndex
CREATE UNIQUE INDEX "flooring_payment_purpose_payment_purpose_number_key" ON "flooring_payment_purpose"("payment_purpose_number");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_payment_purpose_name_key" ON "flooring_payment_purpose"("name");

-- CreateIndex
CREATE INDEX "flooring_payment_purpose_payment_purpose_number_idx" ON "flooring_payment_purpose"("payment_purpose_number");

-- CreateIndex
CREATE INDEX "flooring_payment_purpose_paymentPurposeNumberInt_idx" ON "flooring_payment_purpose"("paymentPurposeNumberInt");

-- CreateIndex
CREATE INDEX "flooring_payment_purpose_name_idx" ON "flooring_payment_purpose"("name");

-- CreateIndex (trgm GIN backs the free-text `name` search bar)
CREATE INDEX "flooring_payment_purpose_name_trgm_idx" ON "flooring_payment_purpose" USING GIN ("name" gin_trgm_ops);
