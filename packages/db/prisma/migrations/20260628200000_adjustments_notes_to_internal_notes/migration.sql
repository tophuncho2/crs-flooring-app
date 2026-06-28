-- Rename the adjustment's own free-text `notes` column to `internalNotes` and
-- widen it from VarChar(30) to VarChar(250). Pure rename + type widen; no
-- backfill, no data loss (widening is lossless). The column is unindexed and
-- carries no FK, so no constraint/index renames are needed. NOTE: this is the
-- adjustment's own notes — distinct from the frozen `inventoryNote` snapshot.
ALTER TABLE "flooring_inventory_adjustment" RENAME COLUMN "notes" TO "internalNotes";
ALTER TABLE "flooring_inventory_adjustment" ALTER COLUMN "internalNotes" TYPE VARCHAR(250);
