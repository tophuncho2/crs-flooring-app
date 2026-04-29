-- CreateEnum
CREATE TYPE "FlooringWorkOrderItemStatus" AS ENUM ('IDLE', 'SAVING_CUTS', 'FINALIZING', 'FAILED');

-- AlterTable
ALTER TABLE "flooring_work_order_item"
  ADD COLUMN "status" "FlooringWorkOrderItemStatus" NOT NULL DEFAULT 'IDLE';
