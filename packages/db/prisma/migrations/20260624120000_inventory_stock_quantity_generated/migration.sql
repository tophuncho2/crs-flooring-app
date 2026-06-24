-- FlooringInventory: STORED generated stock-quantity column.
--
-- `stockQuantity` = GREATEST(startingStock - netDeducted, 0) — the live on-hand
-- balance, mirroring the pure domain helper `computeInventoryBalance` (which
-- clamps negatives to 0). GENERATED ALWAYS STORED, so it auto-populates for
-- every existing row at ALTER time and stays in sync on every write.
--
-- Sort-only: the list view's Quantity column sorts on this column (server-side,
-- backed by the btree index). The value shown in the UI still flows from the
-- domain helper at read time. `startingStock`/`netDeducted` are unmapped
-- camelCase columns, so they are double-quoted in the expression.
-- ============================================================================

ALTER TABLE "flooring_inventory"
  ADD COLUMN "stockQuantity" numeric(12,2)
  GENERATED ALWAYS AS (GREATEST(("startingStock" - "netDeducted"), 0)) STORED;

CREATE INDEX "flooring_inventory_stockQuantity_idx" ON "flooring_inventory" ("stockQuantity");
