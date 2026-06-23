-- ============================================================================
-- FlooringTemplate + FlooringTemplateItem: add `createdBy` / `updatedBy`
-- actor-email columns (and `updatedAt` on the item, which lacked it).
--
-- Why: rows record WHEN they were created/updated (createdAt/updatedAt on the
-- parent) but never WHO. These columns snapshot the EMAIL of the creating /
-- last-updating user (mirroring the FlooringJobType / FlooringPayment /
-- FlooringWarehouse / FlooringProduct / Property actor precedent — a plain
-- string, no FK).
--
-- Unlike every prior module this spans TWO tables. The parent and items mutate
-- INDEPENDENTLY (no row-lock, item edits never bump the parent), so both carry
-- their own actor. Items are UPDATED IN PLACE, so item `updatedBy` is real
-- signal — and the item gained `updatedAt @updatedAt` here for full parity (it
-- previously had only `createdAt`).
--
-- Nullable actor columns, no backfill: historical rows stay NULL (low risk).
-- New rows populate both on insert (creator email); updatedBy flips on edit.
--
-- The item `updatedAt` is NOT NULL with DEFAULT CURRENT_TIMESTAMP so existing
-- rows get a value at add-column time; Prisma's `@updatedAt` stamps it on every
-- subsequent update.
--
-- NOTE: createdBy/updatedBy have NO @map, so their real names are camelCase and
-- MUST be double-quoted — an unquoted identifier folds to lowercase.
-- ============================================================================

ALTER TABLE "flooring_template" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "flooring_template" ADD COLUMN "updatedBy" TEXT;

ALTER TABLE "flooring_template_item" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "flooring_template_item" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "flooring_template_item" ADD COLUMN "updatedBy" TEXT;
