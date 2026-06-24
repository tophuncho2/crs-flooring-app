-- Per-column GIN trigram indexes backing the templates list-view search bars
-- (Unit Type + Description ILIKE substring). Mirrors the FlooringWorkOrder
-- identity-search indexes (20260602130000).

-- CreateIndex
CREATE INDEX "flooring_template_unitType_trgm_idx" ON "flooring_template" USING GIN ("unitType" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "flooring_template_description_trgm_idx" ON "flooring_template" USING GIN ("description" gin_trgm_ops);

-- DropIndex
-- Redundant with the unique index on template_number (templateNumber @unique);
-- a plain btree on the same column adds nothing.
DROP INDEX "flooring_template_template_number_idx";
