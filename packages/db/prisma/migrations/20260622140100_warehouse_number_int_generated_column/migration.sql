-- FlooringWarehouse: STORED generated integer derived from `warehouse_number`.
--
-- Powers the record-view stepper + the exact store-number list search (btree
-- equality on the int). 'STORE-' is 6 chars, so the substring starts at FROM 7
-- (prefix length + 1) — the warehouse analog of inventory's FROM 5 ('INV-').
-- ============================================================================

ALTER TABLE "flooring_warehouse"
  ADD COLUMN "warehouseNumberInt" INTEGER
  GENERATED ALWAYS AS (CAST(SUBSTRING("warehouse_number" FROM 7) AS INTEGER)) STORED;

CREATE INDEX "flooring_warehouse_warehouseNumberInt_idx" ON "flooring_warehouse" ("warehouseNumberInt");
