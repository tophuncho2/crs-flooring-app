-- =====================================================================
-- FlooringCutLog text-column sweep (mirrors the inventory sweep in
-- 20260514180000 and the imports / staged-inventory-row sweep in
-- 20260514170000):
--
--   FlooringCutLog (flooring_cut_log):
--     1. rollNumber    : text -> VARCHAR(30)  (snapshot from inventory)
--     2. dyeLot        : text -> VARCHAR(30)  (snapshot from inventory)
--     3. inventoryNote : text -> VARCHAR(30)  (snapshot from inventory.note)
--     4. location      : text -> VARCHAR(30)  (snapshot from inventory)
--     5. notes         : text -> VARCHAR(30)  (user-input)
--
-- Snapshot columns (1–4) are server-set at cut-log creation from the
-- parent inventory row. With inventory now capped at VARCHAR(30) for
-- rollNumber/dyeLot/note/location (20260514180000), narrowing the
-- snapshots matches the source columns and prevents future drift.
-- There is no user-input path for these four columns, so no validator
-- or UI wiring is required for them.
--
-- The user-input column `notes` (5) is bounded via the shared domain
-- constant CUT_LOG_NOTES_MAX in the follow-up commit; the three
-- cut-log validators (create on WO side, update on WO + INV sides) are
-- updated to enforce the same cap.
--
-- Safe bare ALTERs: confirmed by the operator that no rows currently
-- exceed the new caps, so no `USING substring(...)` coercion is needed.
-- =====================================================================

ALTER TABLE "flooring_cut_log" ALTER COLUMN "rollNumber"    TYPE VARCHAR(30);
ALTER TABLE "flooring_cut_log" ALTER COLUMN "dyeLot"        TYPE VARCHAR(30);
ALTER TABLE "flooring_cut_log" ALTER COLUMN "inventoryNote" TYPE VARCHAR(30);
ALTER TABLE "flooring_cut_log" ALTER COLUMN "location"      TYPE VARCHAR(30);
ALTER TABLE "flooring_cut_log" ALTER COLUMN "notes"         TYPE VARCHAR(30);
