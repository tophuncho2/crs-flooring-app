-- =====================================================================
-- Product unit FK — SET NOT NULL (gated on the backfill)
--
-- Second step of sub-plan 2A. Flips `flooring_product.unitId` to NOT NULL now
-- that every row carries a resolved unit. DEPLOY ONLY AFTER
-- `npm run db:backfill:product-unit -- --apply` has run on this env and its
-- dry-run reported ZERO unresolved rows — otherwise this will fail on the
-- first NULL row. `coverageUnitId` stays nullable (dormant).
-- =====================================================================

-- AlterTable
ALTER TABLE "flooring_product" ALTER COLUMN "unitId" SET NOT NULL;
