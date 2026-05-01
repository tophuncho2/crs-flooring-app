-- ============================================================================
-- FlooringWorkOrderItemStatus: drop SAVING_CUTS
--
-- Pending cut log mutations are now synchronous (one per row, one TX per
-- request). The IDLE -> SAVING_CUTS -> IDLE round-trip the old worker
-- producer/consumer used is no longer needed: the request's TX holds the
-- inventory row lock for the duration. Steady state should have no rows
-- in SAVING_CUTS, so the defensive UPDATE below is a no-op except in the
-- pathological case where a worker died mid-flight.
-- ============================================================================

UPDATE "flooring_work_order_item"
   SET "status" = 'IDLE'
 WHERE "status" = 'SAVING_CUTS';

ALTER TABLE "flooring_work_order_item"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TYPE "FlooringWorkOrderItemStatus"
  RENAME TO "FlooringWorkOrderItemStatus_old";

CREATE TYPE "FlooringWorkOrderItemStatus" AS ENUM ('IDLE', 'FINALIZING', 'FAILED');

ALTER TABLE "flooring_work_order_item"
  ALTER COLUMN "status" TYPE "FlooringWorkOrderItemStatus"
    USING "status"::text::"FlooringWorkOrderItemStatus";

ALTER TABLE "flooring_work_order_item"
  ALTER COLUMN "status" SET DEFAULT 'IDLE';

DROP TYPE "FlooringWorkOrderItemStatus_old";
