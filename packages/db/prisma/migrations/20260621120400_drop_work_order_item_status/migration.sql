-- =====================================================================
-- Work order items: drop the vestigial finalization status.
--
-- The `status` column (enum `FlooringWorkOrderItemStatus`: IDLE |
-- FINALIZING | FAILED) was added for a finalization flow that no longer
-- exists. It was never written (only the DB default applied), never
-- displayed, and absent from every payload and use case. Drop the column
-- and the now-unused enum type.
-- =====================================================================

-- DropColumn
ALTER TABLE "flooring_work_order_item" DROP COLUMN "status";

-- DropEnum
DROP TYPE "FlooringWorkOrderItemStatus";
