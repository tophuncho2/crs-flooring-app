-- =====================================================================
-- Entity Types: standalone user-managed lookup model.
--
-- Adds the `flooring_entity_type` table — the entity-type analog of
-- `flooring_job_type`. Each row is a user-editable lookup with:
--   • `entity_type_number`  — human-readable ET-N, generated from a dedicated
--     sequence (parity with JT-/PAY-/ADJ-/WO- numbers).
--   • `entityTypeNumberInt` — STORED generated int derived from the ET- string;
--     powers the record-view stepper + the exact ET-number list search
--     (btree equality). 'ET-' is 3 chars, so the substring starts FROM 4.
--   • `type`                — VARCHAR(30) free-text label (duplicates allowed,
--     no unique constraint); trgm-GIN indexed for the free-text search bar.
--   • `color`               — non-semantic palette tag (FlooringEntityTypeColor).
--   • `createdBy`/`updatedBy` — actor-email columns (nullable, no FK).
--
-- This table stands ALONE — no foreign keys this slice. pg_trgm is already
-- enabled (20260521044911_enable_pg_trgm), so no CREATE EXTENSION here. The
-- camelCase generated column must be double-quoted (unquoted folds to lowercase).
-- =====================================================================

-- CreateSequence (backs the ET- entity_type_number default)
CREATE SEQUENCE IF NOT EXISTS "flooring_entity_type_number_seq";

-- CreateEnum
CREATE TYPE "FlooringEntityTypeColor" AS ENUM ('SLATE', 'RED', 'AMBER', 'ORANGE', 'LIME', 'GREEN', 'TEAL', 'CYAN', 'BLUE', 'VIOLET', 'PINK', 'ROSE');

-- CreateTable
CREATE TABLE "flooring_entity_type" (
    "id" TEXT NOT NULL,
    "entity_type_number" TEXT NOT NULL DEFAULT ('ET-'::text || (nextval('flooring_entity_type_number_seq'::regclass))::text),
    "type" VARCHAR(30) NOT NULL,
    "color" "FlooringEntityTypeColor" NOT NULL DEFAULT 'SLATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "flooring_entity_type_pkey" PRIMARY KEY ("id")
);

-- STORED generated integer derived from `entity_type_number` (ET- is 3 chars → FROM 4)
ALTER TABLE "flooring_entity_type"
  ADD COLUMN "entityTypeNumberInt" INTEGER
  GENERATED ALWAYS AS (CAST(SUBSTRING("entity_type_number" FROM 4) AS INTEGER)) STORED;

-- CreateIndex
CREATE UNIQUE INDEX "flooring_entity_type_entity_type_number_key" ON "flooring_entity_type"("entity_type_number");

-- CreateIndex
CREATE INDEX "flooring_entity_type_entity_type_number_idx" ON "flooring_entity_type"("entity_type_number");

-- CreateIndex
CREATE INDEX "flooring_entity_type_entityTypeNumberInt_idx" ON "flooring_entity_type"("entityTypeNumberInt");

-- CreateIndex
CREATE INDEX "flooring_entity_type_type_idx" ON "flooring_entity_type"("type");

-- CreateIndex (trgm GIN backs the free-text `type` search bar)
CREATE INDEX "flooring_entity_type_type_trgm_idx" ON "flooring_entity_type" USING GIN ("type" gin_trgm_ops);
