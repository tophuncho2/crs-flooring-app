-- =====================================================================
-- flooring_product: convert the style/color sort indexes to composite (col, id).
--
-- `20260707130000_add_product_sort_indexes` shipped + applied PLAIN btrees on
-- style/color. The house canonical for a sortable nullable text column is the
-- composite `(col, id)` (see entity_state_id_idx, work_order unitType_id_idx):
-- one uniform-direction btree carries the `id` tiebreak the sort builder appends.
-- Authored as a NEW migration — the 130000 one was already applied to the shared
-- dev DB, so it must not be edited in place.
--
-- DROP IF EXISTS is defensive: on the shared dev DB the plain indexes exist; on a
-- fresh env the 130000 migration creates them first, so this always converts.
-- =====================================================================

-- DropIndex
DROP INDEX IF EXISTS "flooring_product_style_idx";

-- DropIndex
DROP INDEX IF EXISTS "flooring_product_color_idx";

-- CreateIndex
CREATE INDEX "flooring_product_style_id_idx" ON "flooring_product"("style", "id");

-- CreateIndex
CREATE INDEX "flooring_product_color_id_idx" ON "flooring_product"("color", "id");
