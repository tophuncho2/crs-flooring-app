-- DropIndex
DROP INDEX "flooring_inventory_purchaseOrderNumber_idx";

-- AlterTable
ALTER TABLE "flooring_inventory" DROP COLUMN "purchaseOrderNumber";
