-- Add free-text store address to payments (nullable, no backfill, no index).
ALTER TABLE "flooring_payment" ADD COLUMN "storeAddress" VARCHAR(150);
