-- Share the non-semantic palette color enum onto inventory rows.
--
-- `PaletteColor` already exists (created for entity types, renamed neutral in
-- 20260624120000_share_palette_color_work_order, then added to work orders and
-- adjustments). This adds the same palette tag to inventory, NOT NULL DEFAULT
-- 'SLATE' (every existing inventory row backfills to SLATE). Metadata only —
-- the column never participates in stock/netDeducted/ledger computation.

ALTER TABLE "flooring_inventory"
    ADD COLUMN "color" "PaletteColor" NOT NULL DEFAULT 'SLATE';
