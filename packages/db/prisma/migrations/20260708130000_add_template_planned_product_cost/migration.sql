-- =====================================================================
-- template_planned_product.cost: the per-row money column on planned products.
--
-- The cost concept now lives on planned products (the invoice-product clone is
-- being retired in a follow-up pass). Money standard: DECIMAL(12,2), nullable
-- (NULL = unset), normalized at every write boundary. Purely additive — cost is
-- deliberately NOT carried into the template → work-order sync.
-- =====================================================================

-- AlterTable
ALTER TABLE "template_planned_product" ADD COLUMN "cost" DECIMAL(12,2);
