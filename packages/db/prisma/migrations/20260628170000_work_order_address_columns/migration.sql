-- =====================================================================
-- FlooringWorkOrder: add four WO-owned address columns matching the shape
-- used by Property, Entity, and FlooringWarehouse:
--   - streetAddress
--   - city
--   - state
--   - postalCode
--
-- These are snapshotted from the selected property at pick time in the
-- record view but remain editable + detachable thereafter. Plain nullable
-- TEXT (no length bound), distinct from the existing freeform
-- `customAddress` override, which is left untouched.
--
-- Nullable, no backfill: historical rows stay NULL. camelCase identifiers
-- MUST be double-quoted — an unquoted identifier folds to lowercase.
-- =====================================================================

ALTER TABLE "flooring_work_order" ADD COLUMN "streetAddress" TEXT;
ALTER TABLE "flooring_work_order" ADD COLUMN "city" TEXT;
ALTER TABLE "flooring_work_order" ADD COLUMN "state" TEXT;
ALTER TABLE "flooring_work_order" ADD COLUMN "postalCode" TEXT;
