-- =====================================================================
-- flooring_product: btree indexes backing the list-view Sort tool.
--
-- The Sort menu exposes createdAt, updatedAt, style, color (+ category, which
-- rides FlooringCategory.name's unique btree — no product-side index needed).
-- All are composite (col, id) — the house canonical: one uniform-direction btree
-- serves ASC/DESC via backward scan and carries the id tiebreak (timestamps are
-- tie-prone on bulk imports). style/color are nullable free-text; the existing
-- GIN-trgm indexes serve ILIKE search only — they do NOT serve ORDER BY.
-- =====================================================================

-- CreateIndex
CREATE INDEX "flooring_product_createdAt_id_idx" ON "flooring_product"("createdAt", "id");

-- CreateIndex
CREATE INDEX "flooring_product_updatedAt_id_idx" ON "flooring_product"("updatedAt", "id");

-- CreateIndex
CREATE INDEX "flooring_product_style_id_idx" ON "flooring_product"("style", "id");

-- CreateIndex
CREATE INDEX "flooring_product_color_id_idx" ON "flooring_product"("color", "id");
