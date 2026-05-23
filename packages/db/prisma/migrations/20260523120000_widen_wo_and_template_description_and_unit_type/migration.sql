-- =====================================================================
-- Widen short free-text caps on FlooringWorkOrder and FlooringTemplate:
--   description : VARCHAR(60)  -> VARCHAR(120)
--   unitType    : VARCHAR(30)  -> VARCHAR(40)
--
-- Widening a VarChar is always safe (no truncation possible, no USING
-- clause needed) regardless of row count. Domain caps in
-- packages/domain/src/{flooring/work-orders,management/templates}/
-- column-limits.ts are bumped in the following commit so validators
-- and UI character counters inherit the new lengths.
-- =====================================================================

ALTER TABLE "flooring_template"   ALTER COLUMN "unitType"    TYPE VARCHAR(40);
ALTER TABLE "flooring_template"   ALTER COLUMN "description" TYPE VARCHAR(120);

ALTER TABLE "flooring_work_order" ALTER COLUMN "unitType"    TYPE VARCHAR(40);
ALTER TABLE "flooring_work_order" ALTER COLUMN "description" TYPE VARCHAR(120);
