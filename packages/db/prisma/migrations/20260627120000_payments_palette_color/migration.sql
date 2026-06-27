-- Install the shared PaletteColor palette-tag on payments (edit-only).
-- Existing rows backfill to the SLATE default.
ALTER TABLE "flooring_payment" ADD COLUMN "color" "PaletteColor" NOT NULL DEFAULT 'SLATE';
