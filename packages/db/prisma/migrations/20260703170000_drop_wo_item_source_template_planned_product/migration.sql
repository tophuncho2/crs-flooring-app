-- Delink template planned products from work-order item rows.
-- The sync still copies planned products into WO material rows, but copied rows
-- no longer carry a back-reference to their template origin. Drop the soft-ref
-- column + its index (no FK constraint exists on this column).
-- Stacks on top of 20260703160000 which renamed the column/index into these names.

DROP INDEX "flooring_work_order_item_sourceTemplatePlannedProductId_idx";
ALTER TABLE "flooring_work_order_item" DROP COLUMN "sourceTemplatePlannedProductId";
