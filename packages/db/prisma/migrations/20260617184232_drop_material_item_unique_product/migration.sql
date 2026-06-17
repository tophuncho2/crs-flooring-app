-- =====================================================================
-- Material items: drop the "one product per parent" restriction
--
-- Reverses the composite UNIQUE indexes added in
-- 20260525140000_unique_material_item_product_and_optional_quantity.
-- A product may now be linked to a work order / template any number of
-- times. The plain @@index([productId]) / parent indexes remain for
-- lookups; only the uniqueness guard is removed.
--
-- Quantity stays optional (that relaxation is unrelated and untouched).
-- =====================================================================

DROP INDEX "flooring_work_order_item_workOrderId_productId_key";

DROP INDEX "flooring_template_item_templateId_productId_key";
