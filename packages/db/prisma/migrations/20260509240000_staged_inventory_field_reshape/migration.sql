-- Drop FK + index for the FlooringLocation relation; replace with a plain text column.
ALTER TABLE "flooring_import_staged_inventory_row" DROP CONSTRAINT IF EXISTS "flooring_import_staged_inventory_row_locationId_fkey";
DROP INDEX IF EXISTS "flooring_import_staged_inventory_row_locationId_idx";
ALTER TABLE "flooring_import_staged_inventory_row" DROP COLUMN "locationId";

-- Drop cost / freight (out of scope for the imports flow now).
ALTER TABLE "flooring_import_staged_inventory_row" DROP COLUMN "cost";
ALTER TABLE "flooring_import_staged_inventory_row" DROP COLUMN "freight";

-- Renames preserve existing data.
ALTER TABLE "flooring_import_staged_inventory_row" RENAME COLUMN "itemNumber" TO "rollNumber";
ALTER TABLE "flooring_import_staged_inventory_row" RENAME COLUMN "notes" TO "note";

-- New plain text location column (replaces the dropped FK).
ALTER TABLE "flooring_import_staged_inventory_row" ADD COLUMN "location" TEXT;
