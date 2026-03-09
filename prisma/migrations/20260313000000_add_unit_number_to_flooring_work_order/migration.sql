-- Ensure unit number exists on flooring work orders for Unit text + number configuration
ALTER TABLE "flooring_work_order"
  ADD COLUMN IF NOT EXISTS "unitNumber" INTEGER;
