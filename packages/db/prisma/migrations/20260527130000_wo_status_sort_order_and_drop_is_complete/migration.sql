-- =====================================================================
-- Work Order Status: add `sortOrder` so the picker can render workflow
-- order (none -> ... -> complete) instead of alphabetical by name.
--
-- Work Order: drop the deprecated `is_complete` boolean. It is superseded
-- by the "complete" status; the prior code sweep removed all references.
-- Any work order still flagged `is_complete = true` is migrated to the
-- "complete" status BEFORE the column is dropped so completion state is
-- preserved.
--
-- A "Complete" status row is bootstrapped here (idempotent by slug) so the
-- backfill has a target even on a DB where the seed has not run yet; the
-- seed script (seed-work-order-statuses.js) upserts the full set by slug
-- afterward, so this bootstrap is idempotent.
-- =====================================================================

-- AlterTable: status sort order
ALTER TABLE "flooring_work_order_status" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Assign workflow order to the existing seeded statuses.
UPDATE "flooring_work_order_status" SET "sortOrder" = 1 WHERE "slug" = 'none';
UPDATE "flooring_work_order_status" SET "sortOrder" = 2 WHERE "slug" = 'assigned';
UPDATE "flooring_work_order_status" SET "sortOrder" = 3 WHERE "slug" = 'delivered';

-- Bootstrap the permanent "Complete" status (idempotent by slug).
INSERT INTO "flooring_work_order_status" ("id", "slug", "name", "sortOrder", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'complete', 'Complete', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name", "sortOrder" = EXCLUDED."sortOrder";

-- Preserve completion state before dropping the boolean.
UPDATE "flooring_work_order"
SET "status_id" = (SELECT "id" FROM "flooring_work_order_status" WHERE "slug" = 'complete')
WHERE "is_complete" = true;

-- DropIndex + DropColumn: the deprecated is_complete boolean.
DROP INDEX "flooring_work_order_is_complete_idx";
ALTER TABLE "flooring_work_order" DROP COLUMN "is_complete";
