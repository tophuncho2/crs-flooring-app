-- FlooringProduct: STORED generated integer derived from `product_number`.
--
-- Powers the record-view stepper + the exact product-number list search (btree
-- equality on the int). 'PROD-' is 5 chars, so the substring starts at FROM 6
-- (prefix length + 1) — the product analog of properties' FROM 6 ('PROP-').
-- ============================================================================

ALTER TABLE "flooring_product"
  ADD COLUMN "productNumberInt" INTEGER
  GENERATED ALWAYS AS (CAST(SUBSTRING("product_number" FROM 6) AS INTEGER)) STORED;

CREATE INDEX "flooring_product_productNumberInt_idx" ON "flooring_product" ("productNumberInt");
