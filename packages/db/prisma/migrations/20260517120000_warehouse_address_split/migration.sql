-- =====================================================================
-- Split FlooringWarehouse.address into four discrete address columns to
-- match the shape used by Property and FlooringManagementCompany:
--   - streetAddress
--   - city
--   - state
--   - postalCode
--
-- The old single `address` column is dropped without backfill. All
-- existing values were cleared by the operator prior to this migration,
-- so no USING clause / data migration is required.
-- =====================================================================

ALTER TABLE "flooring_warehouse" DROP COLUMN "address";
ALTER TABLE "flooring_warehouse" ADD COLUMN "streetAddress" TEXT;
ALTER TABLE "flooring_warehouse" ADD COLUMN "city" TEXT;
ALTER TABLE "flooring_warehouse" ADD COLUMN "state" TEXT;
ALTER TABLE "flooring_warehouse" ADD COLUMN "postalCode" TEXT;
