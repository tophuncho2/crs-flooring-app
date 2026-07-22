-- =====================================================================
-- template.totalTransaction: a manually-entered money total on the template.
--
-- Money standard: DECIMAL(12,2), nullable (NULL = unset), normalized at every
-- write boundary. Purely additive — the user types it on the record-view primary
-- section. Deliberately NOT carried into the template → work-order sync
-- (mirrors template_planned_product.cost).
-- =====================================================================

-- AlterTable
ALTER TABLE "template" ADD COLUMN "totalTransaction" DECIMAL(12,2);
