-- Job costing, Phase A. Adds the persisted money columns for pricing a planned
-- product line. All nullable (NULL = unset), money standard Decimal(12,2).
--
--   flooring_product.unitPrice          — customer-facing sell price per unit;
--                                         seeds onto a planned product on select.
--   template_planned_product.unitPrice  — the row's editable sell price (seeded).
--   template_planned_product.tax        — manual entry.
--   template_planned_product.freight    — manual entry.
--
-- Bid cost is NOT stored (live read-join off product.cost). Line total
-- (qty × unitPrice + tax + freight) is computed on read, never stored.

ALTER TABLE "flooring_product" ADD COLUMN "unitPrice" DECIMAL(12, 2);

ALTER TABLE "template_planned_product" ADD COLUMN "unitPrice" DECIMAL(12, 2);
ALTER TABLE "template_planned_product" ADD COLUMN "tax" DECIMAL(12, 2);
ALTER TABLE "template_planned_product" ADD COLUMN "freight" DECIMAL(12, 2);
