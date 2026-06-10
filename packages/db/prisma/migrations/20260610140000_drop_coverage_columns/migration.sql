-- =====================================================================
-- Drop the coverage feature columns.
--
-- The coverage concept (per-unit coverage + its unit-label snapshots) has
-- been fully retired: code stopped reading/writing these columns and the
-- stock=coverage 1:1 data move already landed on main, so they are now dead.
-- Send unit + stock unit are unaffected.
--
-- KEPT: flooring_product.coveragePerUnit (still holds its values by design).
--
-- DROP COLUMN cascades the owning FK + single-column index, but they are
-- dropped explicitly here to mirror Prisma's generated output.
-- =====================================================================

-- DropForeignKey
ALTER TABLE "flooring_category" DROP CONSTRAINT "flooring_category_itemCoverageUnitId_fkey";

-- DropIndex
DROP INDEX "flooring_category_itemCoverageUnitId_idx";

-- AlterTable
ALTER TABLE "flooring_category" DROP COLUMN "itemCoverageUnitId";

-- AlterTable
ALTER TABLE "flooring_product" DROP COLUMN "itemCoverageUnitName",
DROP COLUMN "itemCoverageUnitAbbrev";

-- AlterTable
ALTER TABLE "flooring_inventory" DROP COLUMN "coveragePerUnit",
DROP COLUMN "itemCoverageUnitName",
DROP COLUMN "itemCoverageUnitAbbrev";

-- AlterTable
ALTER TABLE "flooring_inventory_adjustment" DROP COLUMN "coverage",
DROP COLUMN "itemCoverageUnitName",
DROP COLUMN "itemCoverageUnitAbbrev";
