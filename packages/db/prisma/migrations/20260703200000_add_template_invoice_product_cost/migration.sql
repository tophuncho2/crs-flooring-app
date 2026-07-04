-- =====================================================================
-- template_invoice_product.cost: the invoice-only money column.
--
-- The deferred divergence from planned products — invoice rows grow a per-row
-- cost while `template_planned_product` deliberately stays cost-free. Money
-- standard: DECIMAL(12,2), nullable (NULL = unset), normalized at every write
-- boundary. Sorts above 20260703190000 (the create) so it applies after it.
-- =====================================================================

-- AlterTable
ALTER TABLE "template_invoice_product" ADD COLUMN "cost" DECIMAL(12,2);
