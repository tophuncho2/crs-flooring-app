-- Add optional warehouse link for flooring templates.
ALTER TABLE "flooring_template"
  ADD COLUMN IF NOT EXISTS "warehouseId" TEXT;

CREATE INDEX IF NOT EXISTS "flooring_template_warehouseId_idx"
  ON "flooring_template" ("warehouseId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flooring_template_warehouseId_fkey'
  ) THEN
    ALTER TABLE "flooring_template"
      ADD CONSTRAINT "flooring_template_warehouseId_fkey"
      FOREIGN KEY ("warehouseId")
      REFERENCES "flooring_warehouse"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;
