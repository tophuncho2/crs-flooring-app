-- ============================================================================
-- FlooringWorkOrder: drop the zero-padding on workOrderNumber
--
-- Old default: 'WO-' || lpad(nextval('flooring_work_order_number_seq')::text, 5, '0')
--   → produced WO-00001, WO-00002, ...
-- New default: 'WO-' || nextval('flooring_work_order_number_seq')::text
--   → produces WO-1, WO-2, ...
--
-- All work-order rows were deleted prior to running this migration, and the
-- sequence is restarted at 1 so the first row inserted under the new default
-- is WO-1. workOrderNumber is no longer read by any query, sort, filter, or
-- picker — it is purely a display token on the work-orders list column,
-- record view title, and picker option title (see the prior a-branch
-- cleanup PR for the wire-shape drops that unblocked this edit).
-- ============================================================================

ALTER TABLE "flooring_work_order"
  ALTER COLUMN "work_order_number"
  SET DEFAULT ('WO-' || nextval('flooring_work_order_number_seq')::text);

ALTER SEQUENCE "flooring_work_order_number_seq" RESTART WITH 1;
