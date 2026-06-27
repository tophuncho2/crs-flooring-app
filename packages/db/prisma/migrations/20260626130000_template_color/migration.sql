-- Add the non-semantic palette tag to flooring_template. Edit-only metadata
-- (no business logic reads it). NOT NULL DEFAULT 'SLATE' so all existing rows
-- backfill to SLATE. Mirrors flooring_work_order.color.
ALTER TABLE "flooring_template" ADD COLUMN "color" "PaletteColor" NOT NULL DEFAULT 'SLATE';
