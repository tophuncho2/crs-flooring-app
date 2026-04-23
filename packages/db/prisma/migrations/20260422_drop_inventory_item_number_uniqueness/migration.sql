-- Drop the (locationId, itemNumber) unique constraint on FlooringInventory.
-- User direction: item numbers have zero uniqueness restrictions. Multiple rows
-- may share the same itemNumber at the same location (or anywhere).

ALTER TABLE "flooring_inventory"
  DROP CONSTRAINT IF EXISTS "flooring_inventory_locationId_itemNumber_key";
