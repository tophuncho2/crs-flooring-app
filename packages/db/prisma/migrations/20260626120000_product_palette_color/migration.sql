-- Add the non-semantic palette tag to flooring_product. Distinct from the
-- existing free-text physical `color` column. NOT NULL DEFAULT 'SLATE' so all
-- existing rows backfill to SLATE.
ALTER TABLE "flooring_product" ADD COLUMN "paletteColor" "PaletteColor" NOT NULL DEFAULT 'SLATE';
