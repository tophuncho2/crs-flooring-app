-- =====================================================================
-- Drop FlooringWorkOrderFile model.
--
-- The file-generation worker/flow has been retired: two on-demand print
-- views (/print/work-orders/[id]/slip and /picking-ticket) replace the
-- generated PDF output. All backend + frontend code specific to file
-- generation was removed in the same change set.
--
-- The table's only FK is flooring_work_order_file.workOrderId →
-- flooring_work_order, owned by this table; DROP TABLE removes it. No
-- other table references flooring_work_order_file. The shared
-- "FlooringWorkOrderStatus" enum is retained (still used by
-- flooring_work_order.status).
-- =====================================================================

DROP TABLE "flooring_work_order_file";
