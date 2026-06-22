-- FlooringWarehouse: install the canonical STORE- numbered-record column.
--
-- Mirrors inventory (INV-) / payments (PAY-): a sequence-backed `PREFIX-N` string
-- column, unique + btree indexed. The sequence starts at 7; existing warehouse
-- rows auto-fill STORE-7, STORE-8 … in physical order via the column default
-- (no special backfill), and new warehouses continue from there. The companion
-- generated `warehouseNumberInt` column lands in the follow-up migration.
-- ============================================================================

CREATE SEQUENCE flooring_warehouse_number_seq START 7;

ALTER TABLE "flooring_warehouse"
  ADD COLUMN "warehouse_number" TEXT NOT NULL
    DEFAULT ('STORE-' || nextval('flooring_warehouse_number_seq')::text);

CREATE UNIQUE INDEX "flooring_warehouse_warehouse_number_key" ON "flooring_warehouse"("warehouse_number");

CREATE INDEX "flooring_warehouse_warehouse_number_idx" ON "flooring_warehouse"("warehouse_number");
