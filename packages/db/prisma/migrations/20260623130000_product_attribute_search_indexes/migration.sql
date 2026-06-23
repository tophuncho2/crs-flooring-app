-- pg_trgm is already enabled (20260521044911_enable_pg_trgm), so no CREATE EXTENSION here.

-- CreateIndex
CREATE INDEX "flooring_product_style_trgm_idx" ON "flooring_product" USING GIN ("style" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "flooring_product_color_trgm_idx" ON "flooring_product" USING GIN ("color" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "flooring_product_productNamingAddon_trgm_idx" ON "flooring_product" USING GIN ("productNamingAddon" gin_trgm_ops);
