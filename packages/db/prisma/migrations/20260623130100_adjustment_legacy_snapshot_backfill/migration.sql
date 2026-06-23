-- Legacy snapshot backfill for flooring_inventory_adjustment.
--
-- The identity snapshot columns (inventoryNumber / rollPrefix / rollNumber /
-- dyeLot / inventoryNote) were added 2026-05-11 as nullable with no backfill, so
-- adjustments (then "cut logs") created before that date carry NULL snapshots —
-- which also means a NULL generated `inventoryNumberInt`, i.e. unsearchable.
--
-- This fills those NULL snapshots from the live parent inventory. It is LOSSLESS:
-- inv#/roll#/dye/note are immutable post-create on inventory, so the current
-- parent value equals the create-time value the snapshot would have captured.
-- The GENERATED `inventoryNumberInt` recomputes automatically on the UPDATE.
--
-- Guarded to NULL-snapshot rows only → idempotent (re-running is a no-op). Note
-- the column-name asymmetry: the adjustment snapshot column is `inventoryNote`
-- but the parent inventory column is `note`.
-- ============================================================================

UPDATE "flooring_inventory_adjustment" a
SET "inventoryNumber" = i."inventory_number",
    "rollPrefix"      = i."rollPrefix",
    "rollNumber"      = i."rollNumber",
    "dyeLot"          = i."dyeLot",
    "inventoryNote"   = i."note"
FROM "flooring_inventory" i
WHERE a."inventoryId" = i."id"
  AND a."inventoryNumber" IS NULL;
