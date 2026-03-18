ALTER TABLE "flooring_inventory" DROP CONSTRAINT IF EXISTS "flooring_inventory_locationId_fkey";

ALTER TABLE "flooring_inventory"
  ALTER COLUMN "locationId" DROP NOT NULL;

ALTER TABLE "flooring_inventory"
  ADD CONSTRAINT "flooring_inventory_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "flooring_location"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
