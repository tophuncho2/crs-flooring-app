-- =====================================================================
-- Drop template_invoice_product: the invoice-products clone is retired.
--
-- The `cost` concept moved onto template_planned_product (migration
-- 20260708130000); the invoice-products table was a byte-identical mirror that
-- exists only to carry cost, so it is removed wholesale. Postgres drops the
-- table's indexes and its outbound FK constraints with it; no other table holds
-- a DB constraint pointing AT this one (the removed relations were Prisma-level
-- back-references only). A forward DROP is correct whether or not the create
-- migrations (20260703190000 / 20260703200000) were applied on a given DB.
-- =====================================================================

-- DropTable
DROP TABLE "template_invoice_product";
