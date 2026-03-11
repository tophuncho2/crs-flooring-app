ALTER TABLE "flooring_work_order_item"
ADD COLUMN IF NOT EXISTS "linkedInventoryId" TEXT;

ALTER TABLE "flooring_work_order_item"
ALTER COLUMN "changeOrderStatus" SET DEFAULT 'SUFFICIENT';

CREATE UNIQUE INDEX IF NOT EXISTS "flooring_work_order_item_linkedInventoryId_key"
ON "flooring_work_order_item"("linkedInventoryId")
WHERE "linkedInventoryId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "flooring_work_order_item_linkedInventoryId_idx"
ON "flooring_work_order_item"("linkedInventoryId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flooring_work_order_item_linkedInventoryId_fkey'
  ) THEN
    ALTER TABLE "flooring_work_order_item"
      ADD CONSTRAINT "flooring_work_order_item_linkedInventoryId_fkey"
      FOREIGN KEY ("linkedInventoryId") REFERENCES "flooring_inventory"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "flooring_work_order_item"
SET "changeOrderStatus" = 'SUFFICIENT'
WHERE "changeOrderStatus" IS NULL;
