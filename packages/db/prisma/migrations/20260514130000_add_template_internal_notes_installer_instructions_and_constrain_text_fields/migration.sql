-- =====================================================================
-- FlooringTemplate text-column sweep (mirrors the work-order sweep that
-- landed in 20260513130000 + 20260514120000):
--   1. Constrain two existing free-text columns to VarChar with explicit
--      lengths matching the UI form's intent and the work-order caps
--      (defense in depth — validators will enforce the same lengths via
--      shared TEMPLATE_*_MAX constants in the next commit):
--        - unitType    : text -> VARCHAR(30)
--        - description : text -> VARCHAR(60)
--   2. Add two new optional free-text columns mirroring the work-order
--      additions, with the same VARCHAR(250) caps:
--        - internalNotes          : back-office notes
--        - installerInstructions  : surfaces on the PDF when a template
--                                   is materialized into a work order
--
-- Safe bare ALTERs: the template table is currently empty (schema-first
-- rebuild). The narrows do not need USING clauses because there are no
-- rows to coerce; the new columns are nullable with no default.
-- =====================================================================

ALTER TABLE "flooring_template" ALTER COLUMN "unitType"    TYPE VARCHAR(30);
ALTER TABLE "flooring_template" ALTER COLUMN "description" TYPE VARCHAR(60);

ALTER TABLE "flooring_template" ADD COLUMN "internalNotes" VARCHAR(250);
ALTER TABLE "flooring_template" ADD COLUMN "installerInstructions" VARCHAR(250);
