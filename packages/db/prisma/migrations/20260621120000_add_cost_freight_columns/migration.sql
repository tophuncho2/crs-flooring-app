-- Add nullable cost/freight money columns to staged inventory, inventory, and adjustments.
-- Mirrors the existing startingStock Decimal(12,2) money columns; nullable, no default.

-- AlterTable
ALTER TABLE "flooring_import_staged_inventory_row"
ADD COLUMN     "cost" DECIMAL(12,2),
ADD COLUMN     "freight" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "flooring_inventory"
ADD COLUMN     "cost" DECIMAL(12,2),
ADD COLUMN     "freight" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "flooring_inventory_adjustment"
ADD COLUMN     "cost" DECIMAL(12,2),
ADD COLUMN     "freight" DECIMAL(12,2);
