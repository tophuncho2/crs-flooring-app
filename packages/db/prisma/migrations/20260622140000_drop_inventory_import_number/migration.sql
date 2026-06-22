-- DropIndex
DROP INDEX "flooring_inventory_warehouseId_importNumber_idx";

-- AlterTable
ALTER TABLE "flooring_inventory" DROP COLUMN "importNumber";

-- DropIndex
DROP INDEX "flooring_inventory_warehouseId_purchaseOrderNumber_idx";

-- CreateIndex
CREATE INDEX "flooring_inventory_purchaseOrderNumber_idx" ON "flooring_inventory"("purchaseOrderNumber");
