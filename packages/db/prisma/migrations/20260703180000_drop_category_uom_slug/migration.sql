-- =====================================================================
-- Drop the vestigial `slug` column on Category + Unit of Measure
--
-- Closes the "Group C, deferred" item flagged in
-- 20260703140000_drop_uom_snapshots_and_category_units: the slug columns
-- were the last dependency of the now-dropped snapshot strings. Nothing
-- reads slug anymore — the only functional use (products list order by
-- category.slug) is flipped to category.name in the same change, and the
-- seed runners re-key their upsert on the unique `name`.
--
-- Both tables keep `name @unique`. This is a plain column drop; the
-- auto-generated `*_slug_key` unique indexes drop with the columns.
-- =====================================================================

-- DropIndex
DROP INDEX IF EXISTS "flooring_category_slug_key";
DROP INDEX IF EXISTS "flooring_unit_of_measure_slug_key";

-- AlterTable
ALTER TABLE "flooring_category" DROP COLUMN "slug";
ALTER TABLE "flooring_unit_of_measure" DROP COLUMN "slug";
