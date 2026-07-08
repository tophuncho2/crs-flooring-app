-- =====================================================================
-- flooring_product: btree indexes backing the list-view Sort tool.
--
-- The Sort menu exposes createdAt, updatedAt, style, color (+ category, which
-- rides FlooringCategory.name's unique btree — no product-side index needed).
--   • createdAt / updatedAt: composite (col, id) so the id tiebreak resolves in
--     the same index scan (timestamps are tie-prone on bulk imports).
--   • style / color: plain btree. The existing GIN-trgm indexes serve ILIKE
--     search only — they do NOT serve ORDER BY, so an unindexed sort was a
--     full-table sort until now.
-- =====================================================================

-- CreateIndex
CREATE INDEX "flooring_product_createdAt_id_idx" ON "flooring_product"("createdAt", "id");

-- CreateIndex
CREATE INDEX "flooring_product_updatedAt_id_idx" ON "flooring_product"("updatedAt", "id");

-- CreateIndex
CREATE INDEX "flooring_product_style_idx" ON "flooring_product"("style");

-- CreateIndex
CREATE INDEX "flooring_product_color_idx" ON "flooring_product"("color");
