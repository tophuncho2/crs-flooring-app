-- Drop the deferred job-costing input. `estimatedGrossProfitMargin` was the only
-- stored pricing field on a planned product; margin + the derived subtotal are
-- being ripped out for a clean slate. The displayed cost stays a live read-join
-- off `product.cost` (no column here), so nothing else on the row changes.
ALTER TABLE "template_planned_product"
  DROP COLUMN "estimatedGrossProfitMargin";
