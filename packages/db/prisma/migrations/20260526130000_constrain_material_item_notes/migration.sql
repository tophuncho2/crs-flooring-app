-- =====================================================================
-- Material-item `notes` cap (mirrors the cut-log notes cap in
-- 20260514190000 and the parent template / work-order text sweeps):
--
--   FlooringTemplateItem  (flooring_template_item):
--     notes : text -> VARCHAR(30)  (user-input)
--   FlooringWorkOrderItem (flooring_work_order_item):
--     notes : text -> VARCHAR(30)  (user-input)
--
-- Both `notes` columns are bounded via the shared domain constants
-- TEMPLATE_MATERIAL_ITEM_NOTES_MAX / WORK_ORDER_MATERIAL_ITEM_NOTES_MAX
-- in the same commit; the section-diff validators on each side enforce
-- the same cap, and the inline-edit notes cells get a matching
-- maxLength.
--
-- Safe bare ALTERs: both tables are empty (schema-first rebuild — no
-- work orders or templates exist), so no `USING substring(...)`
-- coercion is needed.
-- =====================================================================

ALTER TABLE "flooring_template_item"   ALTER COLUMN "notes" TYPE VARCHAR(30);
ALTER TABLE "flooring_work_order_item" ALTER COLUMN "notes" TYPE VARCHAR(30);
