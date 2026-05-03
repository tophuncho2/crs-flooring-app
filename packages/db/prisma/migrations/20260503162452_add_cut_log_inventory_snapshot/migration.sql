-- AlterTable
ALTER TABLE "flooring_cut_log" ADD COLUMN     "categorySlug" TEXT NOT NULL,
ADD COLUMN     "dyeLot" TEXT,
ADD COLUMN     "inventoryNumber" TEXT NOT NULL,
ADD COLUMN     "itemNumber" TEXT;
