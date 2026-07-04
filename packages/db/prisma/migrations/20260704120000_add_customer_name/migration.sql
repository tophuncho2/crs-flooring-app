-- Add nullable customerName to work orders and templates. No index, no backfill.
ALTER TABLE "flooring_work_order" ADD COLUMN "customerName" VARCHAR(100);
ALTER TABLE "template" ADD COLUMN "customerName" VARCHAR(100);
