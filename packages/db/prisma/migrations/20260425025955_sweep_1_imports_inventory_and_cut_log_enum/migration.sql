-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE "FlooringStagedRowStatus" AS ENUM ('DRAFT', 'QUEUED', 'IMPORTED');
CREATE TYPE "FlooringCutLogStatus" AS ENUM ('PENDING', 'FINAL', 'VOID');

-- ============================================================================
-- SEQUENCES
-- ============================================================================

CREATE SEQUENCE flooring_inventory_number_seq;

-- ============================================================================
-- FlooringInventory: add inventoryNumber, make itemNumber optional
-- ============================================================================

ALTER TABLE "flooring_inventory"
  ADD COLUMN "inventory_number" TEXT NOT NULL
    DEFAULT ('INV-' || lpad(nextval('flooring_inventory_number_seq')::text, 5, '0'));

CREATE UNIQUE INDEX "flooring_inventory_inventory_number_key"
  ON "flooring_inventory"("inventory_number");

CREATE INDEX "flooring_inventory_inventory_number_idx"
  ON "flooring_inventory"("inventory_number");

ALTER TABLE "flooring_inventory"
  ALTER COLUMN "itemNumber" DROP NOT NULL;

-- ============================================================================
-- FlooringImportStagedInventoryRow: status enum, optional itemNumber, restrict cascade
-- ============================================================================

ALTER TABLE "flooring_import_staged_inventory_row"
  ADD COLUMN "status" "FlooringStagedRowStatus" NOT NULL DEFAULT 'DRAFT';

ALTER TABLE "flooring_import_staged_inventory_row"
  ALTER COLUMN "itemNumber" DROP NOT NULL;

ALTER TABLE "flooring_import_staged_inventory_row"
  DROP CONSTRAINT "flooring_import_staged_inventory_row_importEntryId_fkey";

ALTER TABLE "flooring_import_staged_inventory_row"
  ADD CONSTRAINT "flooring_import_staged_inventory_row_importEntryId_fkey"
    FOREIGN KEY ("importEntryId")
    REFERENCES "flooring_import_entry"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

CREATE INDEX "flooring_import_staged_inventory_row_importEntryId_status_idx"
  ON "flooring_import_staged_inventory_row"("importEntryId", "status");

CREATE INDEX "flooring_import_staged_inventory_row_status_isImported_idx"
  ON "flooring_import_staged_inventory_row"("status", "isImported");

-- ============================================================================
-- FlooringCutLog: convert status String -> enum, add indexes
-- ============================================================================

ALTER TABLE "flooring_cut_log"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "flooring_cut_log"
  ALTER COLUMN "status" TYPE "FlooringCutLogStatus"
    USING "status"::"FlooringCutLogStatus";

ALTER TABLE "flooring_cut_log"
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE INDEX "flooring_cut_log_workOrderItemId_status_idx"
  ON "flooring_cut_log"("workOrderItemId", "status");

CREATE INDEX "flooring_cut_log_inventoryId_status_idx"
  ON "flooring_cut_log"("inventoryId", "status");
