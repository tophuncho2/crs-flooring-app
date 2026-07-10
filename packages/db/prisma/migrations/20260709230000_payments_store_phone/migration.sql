-- Add store phone to payments (nullable, no backfill, no index). Stores canonical digits-only.
ALTER TABLE "flooring_payment" ADD COLUMN "storePhone" VARCHAR(20);
