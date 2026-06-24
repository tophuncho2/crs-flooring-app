-- ============================================================================
-- FlooringImportEntry: add `createdBy` / `updatedBy` actor-email columns.
--
-- Why: rows record WHEN they were created/updated (createdAt/updatedAt) but
-- never WHO. These columns snapshot the EMAIL of the creating / last-updating
-- user (mirroring the FlooringJobType / FlooringPayment / FlooringWarehouse /
-- FlooringProduct / Property / FlooringTemplate actor precedent — a plain
-- string, no FK).
--
-- AGGREGATE-ROOT design: the import is the aggregate root; its staged-inventory
-- rows + filter rows are internal detail and carry NO actor columns. Every
-- HUMAN mutation to the import OR any of its child rows stamps the PARENT's
-- `updatedBy` (which bumps `updatedAt` via Prisma `@updatedAt`). The worker's
-- materialize path (QUEUED -> IMPORTED) is system-driven and leaves the parent
-- untouched.
--
-- Nullable actor columns, no backfill: historical rows stay NULL (low risk).
-- New rows populate both on insert (creator email); updatedBy flips on edit.
--
-- NOTE: createdBy/updatedBy have NO @map, so their real names are camelCase and
-- MUST be double-quoted — an unquoted identifier folds to lowercase.
-- ============================================================================

ALTER TABLE "flooring_import_entry" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "flooring_import_entry" ADD COLUMN "updatedBy" TEXT;
