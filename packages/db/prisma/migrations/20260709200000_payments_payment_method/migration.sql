-- Add free-text payment method label to payments (nullable, no backfill, no index).
ALTER TABLE "flooring_payment" ADD COLUMN "paymentMethod" VARCHAR(50);
