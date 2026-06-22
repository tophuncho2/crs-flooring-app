-- =====================================================================
-- Adjustments: tear out the retired "finalize / freeze" state machine.
--
-- Drops `status` (enum FlooringInventoryAdjustmentStatus: PENDING | QUEUED
-- | FINAL), `isFinal`, and `finalSequence` from `flooring_inventory_adjustment`.
-- Every adjustment has been freely editable + deletable for some time — these
-- columns are no longer read or written (rows sat at PENDING / false / null),
-- so the column, its companions, the unique constraint, and every supporting
-- index come out together. `adjustmentType` (INCREASE | DEDUCTION) stays; the
-- hub-filter index is rebuilt on the surviving columns.
-- =====================================================================

-- DropIndex (status / isFinal / finalSequence supporting indexes + unique)
DROP INDEX IF EXISTS "flooring_inventory_adjustment_inventoryId_status_idx";
DROP INDEX IF EXISTS "flooring_inventory_adjustment_inventoryId_isFinal_idx";
DROP INDEX IF EXISTS "flooring_inventory_adjustment_status_idx";
DROP INDEX IF EXISTS "flooring_inventory_adjustment_status_isFinal_idx";
DROP INDEX IF EXISTS "flooring_inv_adj_hub_filter_idx";
DROP INDEX IF EXISTS "flooring_inventory_adjustment_inventoryId_finalSequence_key";

-- DropColumn
ALTER TABLE "flooring_inventory_adjustment"
    DROP COLUMN "status",
    DROP COLUMN "isFinal",
    DROP COLUMN "finalSequence";

-- DropEnum
DROP TYPE "FlooringInventoryAdjustmentStatus";

-- CreateIndex (hub filter rebuilt without the dropped `isFinal`)
CREATE INDEX "flooring_inv_adj_hub_filter_idx"
    ON "flooring_inventory_adjustment" ("inventoryId", "adjustmentType");
