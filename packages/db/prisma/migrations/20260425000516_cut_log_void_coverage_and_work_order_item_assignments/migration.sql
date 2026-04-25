-- AlterTable
ALTER TABLE "flooring_cut_log" ADD COLUMN     "coverageCut" DECIMAL(12,2),
ADD COLUMN     "void" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "flooring_work_order_item" ADD COLUMN     "assignedCost" DECIMAL(10,2),
ADD COLUMN     "assignedQuantity" DECIMAL(10,2);
