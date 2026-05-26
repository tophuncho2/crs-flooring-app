-- =====================================================================
-- Material items: one product per parent + optional quantity
--
-- 1. Quantity becomes optional on both work-order and template material
--    items. Dropping NOT NULL is always safe (no rewrite, no USING). The
--    domain validators now treat blank as "unset" (stored NULL); a
--    provided value still must be > 0. WO material-item quantity has no
--    relationship to cut logs (cut logs carry their own before/cut/after
--    and scope inventory by productId), so this is a pure relaxation.
--
-- 2. A product may be linked at most once per work order / per template.
--    Enforced canonically by a composite UNIQUE index — survives every
--    write path (use cases, sync, scripts, imports). Index names are
--    within Postgres' 63-char identifier limit.
--
-- Pre-flight: CREATE UNIQUE INDEX fails if duplicate (parent, product)
-- rows already exist. Staging was confirmed clean before authoring this.
-- =====================================================================

ALTER TABLE "flooring_work_order_item" ALTER COLUMN "quantity" DROP NOT NULL;
ALTER TABLE "flooring_template_item"   ALTER COLUMN "quantity" DROP NOT NULL;

CREATE UNIQUE INDEX "flooring_work_order_item_workOrderId_productId_key"
  ON "flooring_work_order_item"("workOrderId", "productId");

CREATE UNIQUE INDEX "flooring_template_item_templateId_productId_key"
  ON "flooring_template_item"("templateId", "productId");
