-- Share the non-semantic palette color enum onto inventory adjustments.
--
-- `PaletteColor` already exists (created for entity types, renamed neutral in
-- 20260624120000_share_palette_color_work_order, then added to work orders).
-- This adds the same palette tag to adjustments, NOT NULL DEFAULT 'SLATE'
-- (every existing adjustment backfills to SLATE).

ALTER TABLE "flooring_inventory_adjustment"
    ADD COLUMN "color" "PaletteColor" NOT NULL DEFAULT 'SLATE';
