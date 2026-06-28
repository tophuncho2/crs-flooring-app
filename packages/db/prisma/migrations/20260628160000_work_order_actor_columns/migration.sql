-- ============================================================================
-- FlooringWorkOrder + FlooringWorkOrderItem: add `createdBy` / `updatedBy`
-- actor-email columns.
--
-- Why: rows record WHEN they were created/updated (createdAt/updatedAt) but
-- never WHO. These columns snapshot the EMAIL of the creating / last-updating
-- user (mirroring the FlooringTemplate / FlooringJobType / FlooringWarehouse
-- actor precedent — a plain string, no FK).
--
-- Like templates this spans TWO tables. The parent and items mutate
-- INDEPENDENTLY (no row-lock, item edits never bump the parent), so each carries
-- its OWN actor pair. Items are UPDATED IN PLACE, so item `updatedBy` is real
-- signal. Unlike the template-item case, FlooringWorkOrderItem already had
-- `updatedAt`, so no DEFAULT CURRENT_TIMESTAMP backfill is needed here.
--
-- Nullable actor columns, no backfill: historical rows stay NULL (low risk).
-- New rows populate both on insert (creator email); updatedBy flips on edit.
--
-- NOTE: createdBy/updatedBy have NO @map, so their real names are camelCase and
-- MUST be double-quoted — an unquoted identifier folds to lowercase.
-- ============================================================================

ALTER TABLE "flooring_work_order" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "flooring_work_order" ADD COLUMN "updatedBy" TEXT;

ALTER TABLE "flooring_work_order_item" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "flooring_work_order_item" ADD COLUMN "updatedBy" TEXT;
