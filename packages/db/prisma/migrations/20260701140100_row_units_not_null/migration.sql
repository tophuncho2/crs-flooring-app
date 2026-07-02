-- =====================================================================
-- Row unit FKs — SET NOT NULL (gated on the backfill)
--
-- Sub-plan 2B step 2. Flips inventory + adjustment `unitId` to NOT NULL now that
-- every row carries a resolved unit. DEPLOY ONLY AFTER
-- `npm run db:backfill:row-units -- --apply` has run on this env and its dry-run
-- reported ZERO unresolved rows. Staged + filter `unitId` stay nullable
-- (editable in staging; they never materialize a null forward — the importability
-- gate blocks that).
-- =====================================================================

-- AlterTable
ALTER TABLE "flooring_inventory" ALTER COLUMN "unitId" SET NOT NULL;

-- AlterTable
ALTER TABLE "flooring_inventory_adjustment" ALTER COLUMN "unitId" SET NOT NULL;
