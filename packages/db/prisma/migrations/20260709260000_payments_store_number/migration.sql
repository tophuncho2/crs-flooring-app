-- Add free-text store number to payments (nullable, no backfill, no index).
ALTER TABLE "flooring_payment" ADD COLUMN "storeNumber" VARCHAR(100);
