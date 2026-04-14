-- Add missing updatedAt column to flooring_cut_log (table is empty)
ALTER TABLE "flooring_cut_log" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "flooring_cut_log" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Drop 4 legacy case-insensitive unique indexes (replaced by normalization pattern)
DROP INDEX IF EXISTS "flooring_category_name_ci_key";
DROP INDEX IF EXISTS "flooring_category_name_lower_key";
DROP INDEX IF EXISTS "flooring_unit_of_measure_name_ci_key";
DROP INDEX IF EXISTS "flooring_unit_of_measure_name_lower_key";

-- Drop stale CURRENT_TIMESTAMP defaults on updatedAt columns (Prisma manages updatedAt client-side)
ALTER TABLE "flooring_category" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "flooring_unit_of_measure" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "flooring_work_order_allocation_run" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "flooring_work_order_item" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "flooring_work_order_item_allocation" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "flooring_work_order_sales_rep" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "flooring_work_order_service_item" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "queue_outbox_event" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Rename 4 truncated indexes to match Prisma's expected names
ALTER INDEX "flooring_work_order_allocation_run_workOrderId_sourceVersion_ke" RENAME TO "flooring_work_order_allocation_run_workOrderId_sourceVersio_key";
ALTER INDEX "flooring_work_order_item_allocation_workOrderItemId_createdAt_i" RENAME TO "flooring_work_order_item_allocation_workOrderItemId_created_idx";
ALTER INDEX "flooring_work_order_sales_rep_sourceTemplateSalesRepI_idx" RENAME TO "flooring_work_order_sales_rep_sourceTemplateSalesRepId_idx";
ALTER INDEX "queue_outbox_event_topic_status_availableAt_lockedAt_createdAt_" RENAME TO "queue_outbox_event_topic_status_availableAt_lockedAt_create_idx";
