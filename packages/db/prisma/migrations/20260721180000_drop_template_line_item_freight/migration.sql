-- Drop the persisted per-line `freight` column from both template line-item
-- tables. Freight is fully retired from the template job-costing grids; the
-- derived line total is re-based to qty × bidCost + tax (freight addend removed).
-- Bid cost = the live product-cost read-join for planned products, and the manual
-- `bidCost` column for service items.
ALTER TABLE "template_planned_product" DROP COLUMN "freight";
ALTER TABLE "template_service_item" DROP COLUMN "freight";
