-- Ensure unit type exists on flooring work orders for the unit type field.
ALTER TABLE "flooring_work_order"
  ADD COLUMN IF NOT EXISTS "unitType" VARCHAR(255);
