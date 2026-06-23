-- ============================================================================
-- Property (property_hub): add `createdBy` / `updatedBy` actor-email columns.
--
-- Why: rows record WHEN they were created/updated (createdAt/updatedAt) but
-- never WHO. These two columns snapshot the EMAIL of the creating / last-updating
-- user (mirroring the FlooringJobType / FlooringPayment / FlooringWarehouse /
-- FlooringProduct actor precedent — a plain string, no FK).
--
-- Nullable, no backfill: historical rows stay NULL (low risk). New rows populate
-- both on insert (creator email), and updatedBy flips on every edit.
--
-- NOTE: Property createdBy/updatedBy have NO @map, so their real names are
-- camelCase and MUST be double-quoted — an unquoted identifier folds to
-- lowercase.
-- ============================================================================

ALTER TABLE "property_hub" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "property_hub" ADD COLUMN "updatedBy" TEXT;
