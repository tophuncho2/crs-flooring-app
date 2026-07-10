-- Add free-text receipt identifier to payments (nullable, no backfill, no index).
ALTER TABLE "flooring_payment" ADD COLUMN "receiptNumber" VARCHAR(100);
