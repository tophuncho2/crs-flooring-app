/*
  Warnings:

  - You are about to drop the column `coverageAvailableUnitId` on the `flooring_category` table. All the data in the column will be lost.
  - You are about to drop the column `serviceUnitId` on the `flooring_category` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "flooring_category" DROP CONSTRAINT "flooring_category_coverageAvailableUnitId_fkey";

-- DropForeignKey
ALTER TABLE "flooring_category" DROP CONSTRAINT "flooring_category_serviceUnitId_fkey";

-- DropIndex
DROP INDEX "flooring_category_coverageAvailableUnitId_idx";

-- DropIndex
DROP INDEX "flooring_category_serviceUnitId_idx";

-- AlterTable
ALTER TABLE "flooring_category" DROP COLUMN "coverageAvailableUnitId",
DROP COLUMN "serviceUnitId";

-- AlterTable
ALTER TABLE "flooring_inventory" ADD COLUMN     "itemCoverageUnitAbbrev" TEXT,
ADD COLUMN     "itemCoverageUnitName" TEXT,
ADD COLUMN     "sendUnitAbbrev" TEXT,
ADD COLUMN     "sendUnitName" TEXT,
ADD COLUMN     "stockUnitAbbrev" TEXT,
ADD COLUMN     "stockUnitName" TEXT;
