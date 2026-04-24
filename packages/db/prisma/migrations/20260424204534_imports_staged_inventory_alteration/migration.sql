/*
  Warnings:

  - You are about to drop the column `status` on the `flooring_import_entry` table. All the data in the column will be lost.
  - You are about to drop the column `transportType` on the `flooring_import_entry` table. All the data in the column will be lost.
  - You are about to drop the column `isImported` on the `flooring_inventory` table. All the data in the column will be lost.
  - You are about to drop the column `stockCount` on the `flooring_inventory` table. All the data in the column will be lost.
  - Made the column `warehouseId` on table `flooring_import_entry` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `startingStock` to the `flooring_inventory` table without a default value. This is not possible if the table is not empty.
  - Made the column `warehouseId` on table `flooring_inventory` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "flooring_import_entry" DROP CONSTRAINT "flooring_import_entry_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "flooring_inventory" DROP CONSTRAINT "flooring_inventory_warehouseId_fkey";

-- AlterTable
ALTER TABLE "flooring_import_entry" DROP COLUMN "status",
DROP COLUMN "transportType",
ADD COLUMN     "manufacturerId" TEXT,
ADD COLUMN     "percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ALTER COLUMN "warehouseId" SET NOT NULL;

-- AlterTable
ALTER TABLE "flooring_inventory" DROP COLUMN "isImported",
DROP COLUMN "stockCount",
ADD COLUMN     "costPerUnit" DECIMAL(10,2),
ADD COLUMN     "freightPerUnit" DECIMAL(10,2),
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startingStock" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "totalCutSum" DECIMAL(12,2) NOT NULL DEFAULT 0,
ALTER COLUMN "warehouseId" SET NOT NULL;

-- CreateTable
CREATE TABLE "flooring_import_staged_inventory_row" (
    "id" TEXT NOT NULL,
    "importEntryId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "itemNumber" TEXT NOT NULL,
    "dyeLot" TEXT,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT,
    "startingStock" DECIMAL(12,2) NOT NULL,
    "isImported" BOOLEAN NOT NULL DEFAULT false,
    "cost" DECIMAL(10,2),
    "freight" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_import_staged_inventory_row_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flooring_import_staged_inventory_row_importEntryId_idx" ON "flooring_import_staged_inventory_row"("importEntryId");

-- CreateIndex
CREATE INDEX "flooring_import_staged_inventory_row_productId_idx" ON "flooring_import_staged_inventory_row"("productId");

-- CreateIndex
CREATE INDEX "flooring_import_staged_inventory_row_warehouseId_idx" ON "flooring_import_staged_inventory_row"("warehouseId");

-- CreateIndex
CREATE INDEX "flooring_import_staged_inventory_row_locationId_idx" ON "flooring_import_staged_inventory_row"("locationId");

-- CreateIndex
CREATE INDEX "flooring_import_staged_inventory_row_importEntryId_isImport_idx" ON "flooring_import_staged_inventory_row"("importEntryId", "isImported");

-- CreateIndex
CREATE INDEX "flooring_import_entry_manufacturerId_idx" ON "flooring_import_entry"("manufacturerId");

-- CreateIndex
CREATE INDEX "flooring_inventory_isArchived_idx" ON "flooring_inventory"("isArchived");

-- AddForeignKey
ALTER TABLE "flooring_inventory" ADD CONSTRAINT "flooring_inventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_import_staged_inventory_row" ADD CONSTRAINT "flooring_import_staged_inventory_row_importEntryId_fkey" FOREIGN KEY ("importEntryId") REFERENCES "flooring_import_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_import_staged_inventory_row" ADD CONSTRAINT "flooring_import_staged_inventory_row_productId_fkey" FOREIGN KEY ("productId") REFERENCES "flooring_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_import_staged_inventory_row" ADD CONSTRAINT "flooring_import_staged_inventory_row_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_import_staged_inventory_row" ADD CONSTRAINT "flooring_import_staged_inventory_row_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "flooring_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_import_entry" ADD CONSTRAINT "flooring_import_entry_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_import_entry" ADD CONSTRAINT "flooring_import_entry_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "flooring_manufacturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
