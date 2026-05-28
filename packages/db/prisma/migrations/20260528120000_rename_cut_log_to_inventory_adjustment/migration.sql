-- =====================================================================
-- Rename FlooringCutLog → FlooringInventoryAdjustment end-to-end.
--
-- Context: cut logs are evolving into a polymorphic ledger of inventory
-- adjustments. A new `adjustmentType` discriminator (INCREASE | DEDUCTION)
-- replaces the implicit "cut = always deducted" assumption; existing rows
-- backfill to DEDUCTION which preserves their semantics. The `void`
-- column is dropped — voiding was retired from the application layer and
-- only legacy scraps remain to keep voided rows from breaking the UI;
-- this migration removes those scraps along with the column.
--
-- Columns renamed for the broader semantic shift:
--   cut              → quantity      (still positive; direction lives in adjustmentType)
--   coverageCut      → coverage
--   cutLogNumber     → adjustmentNumber  (prefix: CUT- → ADJ-)
--   finalCutSequence → finalSequence
--
-- Sibling rename on FlooringInventory:
--   totalCutSum      → netDeducted   (now semantically net = Σ DEDUCTION − Σ INCREASE)
--
-- Existing indexes preserved (renamed); two new indexes added:
--   - (inventoryId, adjustmentType, isFinal) — for the inventory-hub
--     ledger panel filtered by type + finalized state
--   - (status) — explicit single-column status filter
-- =====================================================================

-- 1. Clean up legacy voided rows. Voiding was retired from the app; any
--    surviving rows are non-functional and would block the VOID enum drop.
DELETE FROM "flooring_cut_log" WHERE "status" = 'VOID' OR "void" = true;

-- 2. Drop the now-unused `void` column.
ALTER TABLE "flooring_cut_log" DROP COLUMN "void";

-- 3. Migrate the status enum: drop VOID by recreating without it.
CREATE TYPE "FlooringInventoryAdjustmentStatus" AS ENUM ('PENDING', 'QUEUED', 'FINAL');
ALTER TABLE "flooring_cut_log"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "FlooringInventoryAdjustmentStatus"
    USING "status"::text::"FlooringInventoryAdjustmentStatus",
  ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP TYPE "FlooringCutLogStatus";

-- 4. Add the new adjustmentType discriminator. Existing rows backfill DEDUCTION.
CREATE TYPE "FlooringInventoryAdjustmentType" AS ENUM ('INCREASE', 'DEDUCTION');
ALTER TABLE "flooring_cut_log"
  ADD COLUMN "adjustmentType" "FlooringInventoryAdjustmentType" NOT NULL DEFAULT 'DEDUCTION';

-- 5. Rename columns to the new vocabulary.
ALTER TABLE "flooring_cut_log" RENAME COLUMN "cut" TO "quantity";
ALTER TABLE "flooring_cut_log" RENAME COLUMN "coverageCut" TO "coverage";
ALTER TABLE "flooring_cut_log" RENAME COLUMN "cutLogNumber" TO "adjustmentNumber";
ALTER TABLE "flooring_cut_log" RENAME COLUMN "finalCutSequence" TO "finalSequence";

-- 6. Rename the auto-number sequence and rewire the column default to ADJ-.
ALTER SEQUENCE "flooring_cut_log_number_seq" RENAME TO "flooring_inventory_adjustment_number_seq";
ALTER TABLE "flooring_cut_log"
  ALTER COLUMN "adjustmentNumber" SET DEFAULT (
    'ADJ-'::text || (nextval('flooring_inventory_adjustment_number_seq'::regclass))::text
  );

-- 7. Rename the table.
ALTER TABLE "flooring_cut_log" RENAME TO "flooring_inventory_adjustment";

-- 8. Rename existing indexes to match the new table name.
ALTER INDEX "flooring_cut_log_pkey" RENAME TO "flooring_inventory_adjustment_pkey";
ALTER INDEX "flooring_cut_log_cutLogNumber_key" RENAME TO "flooring_inventory_adjustment_adjustmentNumber_key";
ALTER INDEX "flooring_cut_log_inventoryId_finalCutSequence_key" RENAME TO "flooring_inventory_adjustment_inventoryId_finalSequence_key";
ALTER INDEX "flooring_cut_log_cutLogNumber_idx" RENAME TO "flooring_inventory_adjustment_adjustmentNumber_idx";
ALTER INDEX "flooring_cut_log_inventoryId_idx" RENAME TO "flooring_inventory_adjustment_inventoryId_idx";
ALTER INDEX "flooring_cut_log_productId_idx" RENAME TO "flooring_inventory_adjustment_productId_idx";
ALTER INDEX "flooring_cut_log_warehouseId_idx" RENAME TO "flooring_inventory_adjustment_warehouseId_idx";
ALTER INDEX "flooring_cut_log_workOrderId_idx" RENAME TO "flooring_inventory_adjustment_workOrderId_idx";
ALTER INDEX "flooring_cut_log_workOrderItemId_idx" RENAME TO "flooring_inventory_adjustment_workOrderItemId_idx";
ALTER INDEX "flooring_cut_log_workOrderItemId_status_idx" RENAME TO "flooring_inventory_adjustment_workOrderItemId_status_idx";
ALTER INDEX "flooring_cut_log_inventoryId_status_idx" RENAME TO "flooring_inventory_adjustment_inventoryId_status_idx";
ALTER INDEX "flooring_cut_log_inventoryId_isFinal_idx" RENAME TO "flooring_inventory_adjustment_inventoryId_isFinal_idx";
ALTER INDEX "flooring_cut_log_status_isFinal_idx" RENAME TO "flooring_inventory_adjustment_status_isFinal_idx";
ALTER INDEX "flooring_cut_log_warehouseId_createdAt_id_idx" RENAME TO "flooring_inventory_adjustment_warehouseId_createdAt_id_idx";
ALTER INDEX "flooring_cut_log_createdAt_id_idx" RENAME TO "flooring_inventory_adjustment_createdAt_id_idx";
ALTER INDEX "flooring_cut_log_inventoryItem_trgm_idx" RENAME TO "flooring_inventory_adjustment_inventoryItem_trgm_idx";

-- 9. Rename foreign-key constraints to match the new table name.
ALTER TABLE "flooring_inventory_adjustment" RENAME CONSTRAINT "flooring_cut_log_inventoryId_fkey" TO "flooring_inventory_adjustment_inventoryId_fkey";
ALTER TABLE "flooring_inventory_adjustment" RENAME CONSTRAINT "flooring_cut_log_productId_fkey" TO "flooring_inventory_adjustment_productId_fkey";
ALTER TABLE "flooring_inventory_adjustment" RENAME CONSTRAINT "flooring_cut_log_warehouseId_fkey" TO "flooring_inventory_adjustment_warehouseId_fkey";
ALTER TABLE "flooring_inventory_adjustment" RENAME CONSTRAINT "flooring_cut_log_workOrderId_fkey" TO "flooring_inventory_adjustment_workOrderId_fkey";
ALTER TABLE "flooring_inventory_adjustment" RENAME CONSTRAINT "flooring_cut_log_workOrderItemId_fkey" TO "flooring_inventory_adjustment_workOrderItemId_fkey";

-- 10. New indexes. The composite name is mapped explicitly because the
--     Prisma default (flooring_inventory_adjustment_inventoryId_adjustmentType_isFinal_idx)
--     overflows the Postgres 63-char identifier limit.
CREATE INDEX "flooring_inv_adj_hub_filter_idx"
  ON "flooring_inventory_adjustment" ("inventoryId", "adjustmentType", "isFinal");
CREATE INDEX "flooring_inventory_adjustment_status_idx"
  ON "flooring_inventory_adjustment" ("status");

-- 11. Rename the parent-inventory aggregate column.
ALTER TABLE "flooring_inventory" RENAME COLUMN "totalCutSum" TO "netDeducted";
