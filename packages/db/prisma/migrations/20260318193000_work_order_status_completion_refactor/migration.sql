ALTER TABLE "flooring_work_order"
ADD COLUMN "is_complete" BOOLEAN NOT NULL DEFAULT false;

UPDATE "flooring_work_order"
SET "is_complete" = true
WHERE "status"::text = 'COMPLETE';

ALTER TYPE "FlooringWorkOrderStatus" RENAME TO "FlooringWorkOrderStatus_old";

CREATE TYPE "FlooringWorkOrderStatus" AS ENUM (
  'BUILDING_ORDER',
  'PENDING_EXPORT',
  'CARPET_CLEANING',
  'SENT_OUT',
  'PENDING',
  'PULL_TEMPLATE',
  'MODIFY'
);

ALTER TABLE "flooring_work_order"
ALTER COLUMN "status" TYPE "FlooringWorkOrderStatus"
USING (
  CASE
    WHEN "status"::text = 'DRAFT' THEN 'BUILDING_ORDER'
    WHEN "status"::text = 'COMPLETE' THEN 'SENT_OUT'
    ELSE "status"::text
  END
)::"FlooringWorkOrderStatus";

DROP TYPE "FlooringWorkOrderStatus_old";

CREATE INDEX "flooring_work_order_is_complete_idx"
ON "flooring_work_order"("is_complete");
