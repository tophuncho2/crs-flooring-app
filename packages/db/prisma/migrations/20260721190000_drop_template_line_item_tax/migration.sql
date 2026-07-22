-- Drop the persisted per-line `tax` column from both template line-item tables.
-- Tax is fully retired from the template job-costing grids; the derived line total
-- is re-based to qty × bidCost (tax addend removed). Bid cost = the live product-
-- cost read-join for planned products, and the manual `bidCost` column for service
-- items. (A `taxable` boolean is planned for a later session — not added here.)
ALTER TABLE "template_planned_product" DROP COLUMN "tax";
ALTER TABLE "template_service_item" DROP COLUMN "tax";
