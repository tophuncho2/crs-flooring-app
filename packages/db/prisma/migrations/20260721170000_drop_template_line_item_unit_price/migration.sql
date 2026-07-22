-- Drop the persisted per-line `unitPrice` column from both template line-item
-- tables. Unit price now lives only on FlooringProduct; these grids track what a
-- job costs the company (bid cost), and the derived line total is re-based on the
-- bid cost (qty × bidCost + tax + freight). Bid cost = the live product-cost
-- read-join for planned products, and the manual `bidCost` column for service items.
--
-- Ordering note: this migration runs after 20260721160000_create_template_service_item
-- (which creates template_service_item WITH unitPrice), so on a fresh deploy the
-- table is created and then this drops the column — net: no unitPrice column.
ALTER TABLE "template_planned_product" DROP COLUMN "unitPrice";
ALTER TABLE "template_service_item" DROP COLUMN "unitPrice";
