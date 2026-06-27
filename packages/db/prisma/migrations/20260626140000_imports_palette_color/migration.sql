-- Install the shared PaletteColor palette-tag on imports (edit-only).
-- Existing rows backfill to the SLATE default.
ALTER TABLE "flooring_import_entry" ADD COLUMN "color" "PaletteColor" NOT NULL DEFAULT 'SLATE';
