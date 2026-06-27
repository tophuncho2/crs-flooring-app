-- ============================================================================
-- FlooringInventory (flooring_inventory) + FlooringInventoryAdjustment
-- (flooring_inventory_adjustment): add `createdBy` / `updatedBy` actor-email cols.
--
-- Why: both tables record WHEN rows are created/updated (createdAt/updatedAt) but
-- never WHO. These columns snapshot the EMAIL of the creating / last-updating user
-- (mirroring the FlooringWarehouse / FlooringProduct / Property / Entity actor
-- precedent — a plain string, no FK). Both models are first-class records (INV-N /
-- ADJ-N), so each carries its own pair per-row.
--
-- Nullable, no backfill: historical rows stay NULL (low risk). New rows populate
-- both on insert (creator email); updatedBy flips on every human edit. Worker/
-- system writes (staged-row materialization) and the adjustment ledger replay
-- never stamp, so those rows legitimately read NULL.
--
-- NOTE: these columns have NO @map, so their real names are camelCase and MUST be
-- double-quoted — an unquoted identifier folds to lowercase.
-- ============================================================================

ALTER TABLE "flooring_inventory" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "flooring_inventory" ADD COLUMN "updatedBy" TEXT;
ALTER TABLE "flooring_inventory_adjustment" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "flooring_inventory_adjustment" ADD COLUMN "updatedBy" TEXT;
