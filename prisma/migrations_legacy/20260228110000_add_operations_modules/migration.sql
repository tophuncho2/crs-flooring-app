-- AlterEnum
BEGIN;
CREATE TYPE "FlooringImportStatus_new" AS ENUM ('PENDING', 'SHIPPED', 'RECEIVED', 'FINAL');
ALTER TABLE "flooring_import_batch" ALTER COLUMN "status" TYPE "FlooringImportStatus_new" USING ("status"::text::"FlooringImportStatus_new");
ALTER TYPE "FlooringImportStatus" RENAME TO "FlooringImportStatus_old";
ALTER TYPE "FlooringImportStatus_new" RENAME TO "FlooringImportStatus";
DROP TYPE "FlooringImportStatus_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "FlooringTransportType_new" AS ENUM ('TRANSFER_WAREHOUSE', 'WAREHOUSE_RETURN', 'PURCHASE_ORDER');
ALTER TABLE "flooring_import_batch" ALTER COLUMN "transportType" TYPE "FlooringTransportType_new" USING ("transportType"::text::"FlooringTransportType_new");
ALTER TYPE "FlooringTransportType" RENAME TO "FlooringTransportType_old";
ALTER TYPE "FlooringTransportType_new" RENAME TO "FlooringTransportType";
DROP TYPE "FlooringTransportType_old";
COMMIT;

-- AlterTable
ALTER TABLE "flooring_location" DROP COLUMN "section",
ADD COLUMN     "sectionId" TEXT;

-- AlterTable
ALTER TABLE "flooring_import_batch" ADD COLUMN     "totalCost" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "flooring_section" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_section_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flooring_section_warehouseId_name_key" ON "flooring_section"("warehouseId", "name");

-- CreateIndex
CREATE INDEX "flooring_location_sectionId_idx" ON "flooring_location"("sectionId");

-- AddForeignKey
ALTER TABLE "flooring_section" ADD CONSTRAINT "flooring_section_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_location" ADD CONSTRAINT "flooring_location_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "flooring_section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

