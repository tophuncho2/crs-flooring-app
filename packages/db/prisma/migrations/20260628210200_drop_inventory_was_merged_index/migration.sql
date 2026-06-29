-- Drop the now-dead index backing the retired `wasMerged` flag. All code refs to
-- `wasMerged` have been removed; the column itself is kept as a bare column until
-- the eventual hard column-drop (a later, post-main migration).
DROP INDEX IF EXISTS "flooring_inventory_wasMerged_idx";
