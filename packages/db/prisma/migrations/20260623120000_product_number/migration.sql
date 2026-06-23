-- FlooringProduct: install the canonical PROD- numbered-record column.
--
-- Mirrors properties (PROP-) / job-types (JT-) / inventory (INV-): a
-- sequence-backed `PREFIX-N` string column, unique + btree indexed. Clean
-- install — the sequence starts at 1 (no START clause), so existing product
-- rows auto-fill PROD-1, PROD-2 … in physical order via the column default (no
-- backfill, no renumber), and new products continue from there. The companion
-- generated `productNumberInt` column lands in the follow-up migration.
-- ============================================================================

CREATE SEQUENCE flooring_product_number_seq;

ALTER TABLE "flooring_product"
  ADD COLUMN "product_number" TEXT NOT NULL
    DEFAULT ('PROD-' || nextval('flooring_product_number_seq')::text);

CREATE UNIQUE INDEX "flooring_product_product_number_key" ON "flooring_product"("product_number");

CREATE INDEX "flooring_product_product_number_idx" ON "flooring_product"("product_number");
