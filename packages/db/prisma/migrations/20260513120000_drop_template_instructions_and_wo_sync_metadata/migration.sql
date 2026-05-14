-- =====================================================================
-- Drop hardened template-sync dead columns.
--
-- All hand-authored references to these fields were cleared from the
-- domain, data, application, api, and ui layers in prior commits.
-- None were read for comparison; sync now copies a slim set of core
-- fields and items, with templateId + createdAt providing provenance.
--
-- flooring_template:
--   - instructions   : removed from UI/form/validators; column unused
--   - templateNotes  : removed from UI/form/validators; column unused
--
-- flooring_work_order:
--   - templateSyncedAt     : sync metadata, never read
--   - templateSyncMode     : sync metadata, only one value ever written ("copy")
--   - templateSnapshotHash : never compared; drift detection was never built
-- =====================================================================

ALTER TABLE "flooring_template" DROP COLUMN "instructions";
ALTER TABLE "flooring_template" DROP COLUMN "templateNotes";
ALTER TABLE "flooring_work_order" DROP COLUMN "templateSyncedAt";
ALTER TABLE "flooring_work_order" DROP COLUMN "templateSyncMode";
ALTER TABLE "flooring_work_order" DROP COLUMN "templateSnapshotHash";
