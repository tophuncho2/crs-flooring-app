-- The planned-product cost is no longer stored — it is a live read-join off the
-- linked product's `cost`. Pricing is now driven by a stored gross-profit margin
-- percent; the row subtotal derives from quantity × product.cost ÷ (1 − margin).

-- AlterTable
ALTER TABLE "template_planned_product" DROP COLUMN "cost";

-- AlterTable
ALTER TABLE "template_planned_product" ADD COLUMN "estimatedGrossProfitMargin" DECIMAL(5,2);
