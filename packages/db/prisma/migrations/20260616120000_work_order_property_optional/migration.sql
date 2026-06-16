-- =====================================================================
-- Make a work order's property optional.
--
-- A work order is stubbed out before a property is chosen; the
-- auto-generated work_order_number means a row is never truly empty, so
-- propertyId no longer needs to be NOT NULL. Existing rows keep their
-- values. The FK + onDelete RESTRICT are unchanged — only nullability
-- drops, so no constraint is recreated.
-- =====================================================================

-- AlterTable
ALTER TABLE "flooring_work_order" ALTER COLUMN "propertyId" DROP NOT NULL;
