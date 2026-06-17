-- Decouple inventory adjustments from work-order material items. An adjustment
-- now links only to a work order (`workOrderId`, any product), never to a
-- material item. Drop the `workOrderItemId` FK, its two indexes, and the column.
-- Existing rows keep their `workOrderId` + `productId`, so WO grouping and the
-- print files still resolve.

-- DropForeignKey
ALTER TABLE "flooring_inventory_adjustment" DROP CONSTRAINT "flooring_inventory_adjustment_workOrderItemId_fkey";

-- DropIndex
DROP INDEX "flooring_inventory_adjustment_workOrderItemId_idx";

-- DropIndex
DROP INDEX "flooring_inventory_adjustment_workOrderItemId_status_idx";

-- AlterTable
ALTER TABLE "flooring_inventory_adjustment" DROP COLUMN "workOrderItemId";
