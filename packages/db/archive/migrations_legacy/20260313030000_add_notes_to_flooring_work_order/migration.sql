-- Ensure notes exists on flooring work orders for notes/editing fields.
ALTER TABLE "flooring_work_order"
  ADD COLUMN IF NOT EXISTS "notes" TEXT;
