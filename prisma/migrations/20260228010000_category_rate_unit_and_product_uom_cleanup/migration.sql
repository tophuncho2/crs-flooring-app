-- AddColumn
ALTER TABLE "Category" ADD COLUMN "rateUnit" TEXT;

-- Backfill existing rows with a safe default
UPDATE "Category" SET "rateUnit" = 'unit' WHERE "rateUnit" IS NULL;

-- Make required after backfill
ALTER TABLE "Category" ALTER COLUMN "rateUnit" SET NOT NULL;

-- Drop removed product columns
ALTER TABLE "Product" DROP COLUMN "materialRate";
ALTER TABLE "Product" DROP COLUMN "materialUom";
ALTER TABLE "Product" DROP COLUMN "laborUom";
