-- Drop the denormalized productName snapshot columns. The product name is now
-- rendered from the live `product` FK join (buildFlooringProductDisplayName) at
-- read time; nothing writes or reads these columns anymore.
ALTER TABLE "flooring_inventory" DROP COLUMN "productName";
ALTER TABLE "flooring_inventory_adjustment" DROP COLUMN "productName";
