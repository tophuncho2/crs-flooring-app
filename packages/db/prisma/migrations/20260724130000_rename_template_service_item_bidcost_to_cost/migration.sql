-- Rename the persisted job-costing money column on the template service item from
-- `bidCost` to `cost`. Pure column rename — existing values are preserved. The
-- planned-product side never stored this (it's a live `product.cost` read-join), so
-- this touches only template_service_item. Aligns the DB column, the Prisma field,
-- and the "Cost" grid header across all layers.
ALTER TABLE "template_service_item" RENAME COLUMN "bidCost" TO "cost";
