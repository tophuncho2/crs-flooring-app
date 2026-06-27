-- Install the shared PaletteColor palette-tag on properties (edit-only).
-- Existing rows backfill to the SLATE default.
ALTER TABLE "property_hub" ADD COLUMN "color" "PaletteColor" NOT NULL DEFAULT 'SLATE';
