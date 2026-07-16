-- =====================================================================
-- Work-Order Document Types: standalone user-managed lookup model.
--
-- Adds `flooring_work_order_document_type` — a user-editable lookup that drives
-- the work-order PRINT/EXPORT configurator's per-doc-type checkbox defaults:
--   • `work_order_document_type_number`   — human-readable ROW-N, generated from a
--     dedicated sequence (parity with ET-/JT-/PAY-/ADJ-/WO- numbers).
--   • `workOrderDocumentTypeNumberInt`    — STORED generated int derived from the
--     ROW- string; powers the record-view stepper + the exact ROW-number list
--     search (btree equality). 'ROW-' is 4 chars, so the substring starts FROM 5.
--   • `name`                              — VARCHAR(40), UNIQUE (one doc type per
--     label; also the printed document tag); trgm-GIN indexed for the name search.
--   • `color`                             — non-semantic palette tag (shared PaletteColor).
--   • `printConfig`                       — JSONB, the per-doc-type checkbox default
--     visibilities. Defaults to '{}' and is MERGED over the code base-defaults on
--     read (resolvePrintConfig), so new print columns flow in without a backfill.
--   • `createdBy`/`updatedBy`             — actor-email columns (nullable, no FK).
--
-- Seeds the two doc types the client already exposed ("Picking Ticket",
-- "Work Order") with an empty '{}' printConfig, which resolves to the full-on
-- base defaults — preserving today's behavior until operators tune them.
--
-- The shared "PaletteColor" enum already exists (no CREATE TYPE). pg_trgm is
-- already enabled. The camelCase generated column must be double-quoted.
-- =====================================================================

-- CreateSequence (backs the ROW- work_order_document_type_number default)
CREATE SEQUENCE IF NOT EXISTS "flooring_work_order_document_type_number_seq";

-- CreateTable
CREATE TABLE "flooring_work_order_document_type" (
    "id" TEXT NOT NULL,
    "work_order_document_type_number" TEXT NOT NULL DEFAULT ('ROW-'::text || (nextval('flooring_work_order_document_type_number_seq'::regclass))::text),
    "name" VARCHAR(40) NOT NULL,
    "color" "PaletteColor" NOT NULL DEFAULT 'SLATE',
    "printConfig" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "flooring_work_order_document_type_pkey" PRIMARY KEY ("id")
);

-- STORED generated integer derived from `work_order_document_type_number` (ROW- is 4 chars → FROM 5)
ALTER TABLE "flooring_work_order_document_type"
  ADD COLUMN "workOrderDocumentTypeNumberInt" INTEGER
  GENERATED ALWAYS AS (CAST(SUBSTRING("work_order_document_type_number" FROM 5) AS INTEGER)) STORED;

-- CreateIndex
-- NOTE: short index names (fwodt_*) — the default names built from the table +
-- the long `work_order_document_type_number` column exceed Postgres' 63-byte
-- identifier limit, and the UNIQUE + btree would truncate to the SAME name and
-- collide (42P07). These names match the schema's `map:` values.
CREATE UNIQUE INDEX "fwodt_number_key" ON "flooring_work_order_document_type"("work_order_document_type_number");

-- CreateIndex
CREATE UNIQUE INDEX "fwodt_name_key" ON "flooring_work_order_document_type"("name");

-- CreateIndex
CREATE INDEX "fwodt_number_idx" ON "flooring_work_order_document_type"("work_order_document_type_number");

-- CreateIndex
CREATE INDEX "fwodt_number_int_idx" ON "flooring_work_order_document_type"("workOrderDocumentTypeNumberInt");

-- CreateIndex
CREATE INDEX "fwodt_name_idx" ON "flooring_work_order_document_type"("name");

-- CreateIndex (trgm GIN backs the free-text `name` search bar)
CREATE INDEX "fwodt_name_trgm_idx" ON "flooring_work_order_document_type" USING GIN ("name" gin_trgm_ops);

-- Seed the two doc types the client already exposed. Empty '{}' printConfig ⇒
-- resolves to the full-on base defaults (no behavior change until operators tune).
INSERT INTO "flooring_work_order_document_type" ("id", "name", "printConfig", "updatedAt")
VALUES
    ('a1d0c6e8-3f1b-4a2c-9e7d-1b2c3d4e5f01', 'Picking Ticket', '{}'::jsonb, CURRENT_TIMESTAMP),
    ('a1d0c6e8-3f1b-4a2c-9e7d-1b2c3d4e5f02', 'Work Order', '{}'::jsonb, CURRENT_TIMESTAMP);
