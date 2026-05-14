-- =====================================================================
-- FlooringWorkOrder cleanup pass:
--   1. Drop dead instructions + notes columns. All hand-authored
--      references were cleared from the domain, data, application, api,
--      and ui layers in prior commits. The file-generation worker reads
--      property.instructions (joined), per-item notes, and per-cut-log
--      notes — none of which are affected.
--   2. Constrain three short free-text columns to VarChar with explicit
--      lengths matching the UI form's intent (defense in depth — the
--      validators will enforce the same lengths in the next commit).
--
-- Safe bare ALTERs: the work-order table is currently empty.
-- =====================================================================

ALTER TABLE "flooring_work_order" DROP COLUMN "instructions";
ALTER TABLE "flooring_work_order" DROP COLUMN "notes";

ALTER TABLE "flooring_work_order" ALTER COLUMN "description" TYPE VARCHAR(60);
ALTER TABLE "flooring_work_order" ALTER COLUMN "unitNumber"  TYPE VARCHAR(30);
ALTER TABLE "flooring_work_order" ALTER COLUMN "unitType"    TYPE VARCHAR(30);
