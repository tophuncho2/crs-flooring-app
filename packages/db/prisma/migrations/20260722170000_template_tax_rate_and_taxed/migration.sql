-- Template tax: a manual sales-tax RATE on the template + a per-line "taxed" flag on
-- both line-item tables. Tax Cost is derived (taxRate × the taxed line totals), never
-- stored. Replaces the per-line tax/freight money columns dev-2 dropped earlier.
--
-- taxRate: percent stored as DECIMAL(6,3) (e.g. 8.375), nullable (NULL = unset).
-- taxed: NOT NULL with type-appropriate defaults — materials taxed, labor/service not.
ALTER TABLE "template" ADD COLUMN "taxRate" DECIMAL(6,3);
ALTER TABLE "template_planned_product" ADD COLUMN "taxed" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "template_service_item" ADD COLUMN "taxed" BOOLEAN NOT NULL DEFAULT false;
