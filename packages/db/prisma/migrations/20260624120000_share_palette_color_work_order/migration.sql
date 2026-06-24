-- Share the non-semantic palette color enum across modules.
--
-- The enum was first created for entity types as `FlooringEntityTypeColor`
-- (migration 20260623160000_create_flooring_entity_type). Its original intent was
-- to be a SHARED visual-tag palette, so this migration:
--   1. Renames the enum type to the neutral, module-agnostic `PaletteColor`
--      (no `Flooring` prefix). Rename is metadata-only — existing
--      `flooring_entity_type.color` values are preserved untouched.
--   2. Adds the same palette as `color` to work orders, NOT NULL DEFAULT 'SLATE'
--      (every existing work order backfills to SLATE).

-- 1. Neutral, shared enum name.
ALTER TYPE "FlooringEntityTypeColor" RENAME TO "PaletteColor";

-- 2. Work-order palette tag.
ALTER TABLE "flooring_work_order"
    ADD COLUMN "color" "PaletteColor" NOT NULL DEFAULT 'SLATE';
