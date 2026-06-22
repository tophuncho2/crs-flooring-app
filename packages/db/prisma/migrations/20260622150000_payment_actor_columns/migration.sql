-- ============================================================================
-- FlooringPayment: add `createdBy` / `updatedBy` actor-email columns.
--
-- Why: rows record WHEN they were created/updated (createdAt/updatedAt) but
-- never WHO. These two columns snapshot the EMAIL of the creating / last-updating
-- user (mirroring the actor precedent on FlooringJobType + UserLoginActivity.userEmail —
-- a plain string, no FK).
--
-- Nullable, no backfill: historical rows stay NULL (low risk). New rows populate
-- both on insert (creator email), and updatedBy flips on every edit.
--
-- NOTE: FlooringPayment columns have NO @map, so their real names are camelCase
-- and MUST be double-quoted — an unquoted identifier folds to lowercase.
-- ============================================================================

ALTER TABLE "flooring_payment" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "flooring_payment" ADD COLUMN "updatedBy" TEXT;
