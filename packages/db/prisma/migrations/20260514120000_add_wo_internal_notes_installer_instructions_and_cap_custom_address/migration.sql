-- =====================================================================
-- FlooringWorkOrder text-column sweep:
--   1. Add two new optional free-text columns:
--        - internalNotes          VARCHAR(250)  — back-office notes
--        - installerInstructions  VARCHAR(250)  — surfaces on the PDF
--   2. Constrain customAddress to VARCHAR(200) (was unbounded text) to
--      match the validator cap that lands in the next commit.
--
-- Safe bare ALTERs: the work-order table is currently empty, and the new
-- columns are nullable with no default. The customAddress narrow does
-- not need a USING clause because there are no rows to coerce.
-- =====================================================================

ALTER TABLE "flooring_work_order" ADD COLUMN "internalNotes" VARCHAR(250);
ALTER TABLE "flooring_work_order" ADD COLUMN "installerInstructions" VARCHAR(250);

ALTER TABLE "flooring_work_order" ALTER COLUMN "customAddress" TYPE VARCHAR(200);
