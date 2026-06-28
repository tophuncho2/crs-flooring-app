-- Entity: install the canonical ENT- numbered-record column + the palette color tag.
--
-- Mirrors property (PROP-) / inventory (INV-): a sequence-backed `PREFIX-N`
-- string column, unique + btree indexed. Clean install — the sequence starts at
-- 1 (no START clause), so existing entity rows auto-fill ENT-1, ENT-2 … in
-- physical order via the column default (no backfill, no renumber), and new
-- entities continue from there. The companion generated `entityNumberInt` column
-- lands in the follow-up migration.
--
-- The `color` column reuses the existing "PaletteColor" enum (no CREATE TYPE).
-- It is an edit-only metadata tag — new rows default to SLATE everywhere.
-- ============================================================================

CREATE SEQUENCE entity_number_seq;

ALTER TABLE "entity"
  ADD COLUMN "entity_number" TEXT NOT NULL
    DEFAULT ('ENT-' || nextval('entity_number_seq')::text);

CREATE UNIQUE INDEX "entity_entity_number_key" ON "entity"("entity_number");

CREATE INDEX "entity_entity_number_idx" ON "entity"("entity_number");

ALTER TABLE "entity"
  ADD COLUMN "color" "PaletteColor" NOT NULL DEFAULT 'SLATE';
