-- ============================================================================
-- FlooringCutLog: drop the zero-padding on cutLogNumber
--
-- Old default: 'CUT-' || lpad(nextval('flooring_cut_log_number_seq')::text, 7, '0')
--   → produced CUT-0000001, CUT-0000002, ...
-- New default: 'CUT-' || nextval('flooring_cut_log_number_seq')::text
--   → produces CUT-1, CUT-2, ...
--
-- The sequence itself is unchanged and keeps counting from its current value,
-- so there is no uniqueness collision with previously-inserted padded rows.
-- Existing rows are left as-is (no backfill).
-- ============================================================================

ALTER TABLE "flooring_cut_log"
  ALTER COLUMN "cutLogNumber"
  SET DEFAULT ('CUT-' || nextval('flooring_cut_log_number_seq')::text);

-- ============================================================================
-- FlooringCutLog: add productId / productName / warehouseId snapshot columns
--
-- All three are copied from the parent FlooringInventory row at cut-log
-- creation time and are not editable thereafter (app-layer rule). Added in
-- three steps so the migration is safe on a populated table:
--   1. Add as nullable (NOT NULL would fail on existing rows).
--   2. Backfill from the parent inventory.
--   3. Set NOT NULL on the FK columns + add FK constraints + indexes.
--      productName keeps its '' default and is NOT NULL from the start,
--      mirroring the inventoryItem snapshot column on this same table.
-- ============================================================================

ALTER TABLE "flooring_cut_log"
  ADD COLUMN "productId"   TEXT,
  ADD COLUMN "productName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "warehouseId" TEXT;

UPDATE "flooring_cut_log" cl
SET "productId"   = inv."productId",
    "productName" = inv."productName",
    "warehouseId" = inv."warehouseId"
FROM "flooring_inventory" inv
WHERE cl."inventoryId" = inv."id";

ALTER TABLE "flooring_cut_log"
  ALTER COLUMN "productId"   SET NOT NULL,
  ALTER COLUMN "warehouseId" SET NOT NULL;

ALTER TABLE "flooring_cut_log"
  ADD CONSTRAINT "flooring_cut_log_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "flooring_product"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "flooring_cut_log_warehouseId_fkey"
    FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "flooring_cut_log_productId_idx"
  ON "flooring_cut_log"("productId");

CREATE INDEX "flooring_cut_log_warehouseId_idx"
  ON "flooring_cut_log"("warehouseId");
