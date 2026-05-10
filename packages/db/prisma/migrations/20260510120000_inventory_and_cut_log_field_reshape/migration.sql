-- =====================================================================
-- FlooringInventory: drop locationId FK + cost/freight/per-unit; rename
-- itemNumber→rollNumber, notes→note; add denormalized snapshot columns
-- (productName, categoryName, importNumber, purchaseOrderNumber,
-- internalNotes, inventoryItem) and plain text location; convert
-- fifoReceivedAt to timestamptz.
-- =====================================================================

-- Drop FK + index for the FlooringLocation relation; replace with plain text column.
ALTER TABLE "flooring_inventory" DROP CONSTRAINT IF EXISTS "flooring_inventory_locationId_fkey";
DROP INDEX IF EXISTS "flooring_inventory_locationId_idx";
ALTER TABLE "flooring_inventory" DROP COLUMN "locationId";

-- Drop cost / freight + their per-unit derivatives.
ALTER TABLE "flooring_inventory" DROP COLUMN "cost";
ALTER TABLE "flooring_inventory" DROP COLUMN "freight";
ALTER TABLE "flooring_inventory" DROP COLUMN "costPerUnit";
ALTER TABLE "flooring_inventory" DROP COLUMN "freightPerUnit";

-- Renames preserve existing data.
ALTER TABLE "flooring_inventory" RENAME COLUMN "itemNumber" TO "rollNumber";
ALTER TABLE "flooring_inventory" RENAME COLUMN "notes" TO "note";

-- Rename the composite index to match the renamed column (Prisma generates index names from column names).
ALTER INDEX "flooring_inventory_productId_fifoReceivedAt_itemNumber_id_idx"
  RENAME TO "flooring_inventory_productId_fifoReceivedAt_rollNumber_id_idx";

-- New plain text + snapshot columns. NOT NULL DEFAULT '' for worker-populated
-- snapshots so existing rows backfill cleanly; the worker overwrites on
-- materialize, the update use case keeps inventoryItem in sync.
ALTER TABLE "flooring_inventory" ADD COLUMN "location" TEXT;
ALTER TABLE "flooring_inventory" ADD COLUMN "productName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "flooring_inventory" ADD COLUMN "categoryName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "flooring_inventory" ADD COLUMN "importNumber" TEXT;
ALTER TABLE "flooring_inventory" ADD COLUMN "purchaseOrderNumber" TEXT;
ALTER TABLE "flooring_inventory" ADD COLUMN "internalNotes" VARCHAR(80);
ALTER TABLE "flooring_inventory" ADD COLUMN "inventoryItem" TEXT NOT NULL DEFAULT '';

-- Convert fifoReceivedAt to timestamptz, treating existing values as already in UTC
-- (the worker writes `new Date()` which is UTC-anchored, so this is a no-op in practice).
ALTER TABLE "flooring_inventory"
  ALTER COLUMN "fifoReceivedAt" TYPE TIMESTAMPTZ(6) USING "fifoReceivedAt" AT TIME ZONE 'UTC';


-- =====================================================================
-- FlooringCutLog: drop inventoryNumber/itemNumber/dyeLot/cost/freight;
-- replace with a single denormalized inventoryItem snapshot (immutable
-- after create — copied from inventory.inventoryItem at cut creation
-- time). `notes` is intentionally untouched.
-- =====================================================================

ALTER TABLE "flooring_cut_log" DROP COLUMN "inventoryNumber";
ALTER TABLE "flooring_cut_log" DROP COLUMN "itemNumber";
ALTER TABLE "flooring_cut_log" DROP COLUMN "dyeLot";
ALTER TABLE "flooring_cut_log" DROP COLUMN "cost";
ALTER TABLE "flooring_cut_log" DROP COLUMN "freight";

ALTER TABLE "flooring_cut_log" ADD COLUMN "inventoryItem" TEXT NOT NULL DEFAULT '';
