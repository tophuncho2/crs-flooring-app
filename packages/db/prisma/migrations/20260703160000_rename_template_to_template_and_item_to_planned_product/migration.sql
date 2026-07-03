-- ============================================================================
-- PURE RENAME (metadata-only, data-preserving). No table rewrite, no backfill.
--   FlooringTemplate      -> Template                 (table flooring_template      -> template)
--   FlooringTemplateItem  -> TemplatePlannedProduct   (table flooring_template_item -> template_planned_product)
--   sequence flooring_template_number_seq -> template_number_seq
--   soft-ref col flooring_work_order_item.sourceTemplateItemId -> sourceTemplatePlannedProductId
--
-- Cross-table FKs (e.g. flooring_work_order.templateId -> template) track their
-- target by OID, which RENAME preserves, so no reference rewrite is needed. The
-- template_number column DEFAULT references the sequence by regclass (OID-bound),
-- so renaming the sequence keeps the default working and pg_get_expr then renders
-- the new name -- matching the updated schema.prisma dbgenerated string.
-- ============================================================================

-- 1) Rename the two tables first, then re-address their constraints by new name.
ALTER TABLE "flooring_template" RENAME TO "template";
ALTER TABLE "flooring_template_item" RENAME TO "template_planned_product";

-- 2) Rename the number sequence (OID-stable; column DEFAULT keeps working).
ALTER SEQUENCE "flooring_template_number_seq" RENAME TO "template_number_seq";

-- 3) template: primary key + unique index.
ALTER TABLE "template" RENAME CONSTRAINT "flooring_template_pkey" TO "template_pkey";
ALTER INDEX "flooring_template_template_number_key" RENAME TO "template_template_number_key";

-- 4) template: secondary btree indexes.
ALTER INDEX "flooring_template_propertyId_idx"        RENAME TO "template_propertyId_idx";
ALTER INDEX "flooring_template_warehouseId_idx"       RENAME TO "template_warehouseId_idx";
ALTER INDEX "flooring_template_jobTypeId_idx"         RENAME TO "template_jobTypeId_idx";
ALTER INDEX "flooring_template_unitType_idx"          RENAME TO "template_unitType_idx";
ALTER INDEX "flooring_template_createdAt_idx"         RENAME TO "template_createdAt_idx";
ALTER INDEX "flooring_template_updatedAt_idx"         RENAME TO "template_updatedAt_idx";
ALTER INDEX "flooring_template_templateNumberInt_idx" RENAME TO "template_templateNumberInt_idx";

-- 5) template: GIN trigram indexes.
ALTER INDEX "flooring_template_unitType_trgm_idx"    RENAME TO "template_unitType_trgm_idx";
ALTER INDEX "flooring_template_description_trgm_idx" RENAME TO "template_description_trgm_idx";

-- 6) template: foreign-key constraints (owned by this table).
ALTER TABLE "template" RENAME CONSTRAINT "flooring_template_propertyId_fkey"  TO "template_propertyId_fkey";
ALTER TABLE "template" RENAME CONSTRAINT "flooring_template_warehouseId_fkey" TO "template_warehouseId_fkey";
ALTER TABLE "template" RENAME CONSTRAINT "flooring_template_jobTypeId_fkey"   TO "template_jobTypeId_fkey";

-- 7) template_planned_product: primary key.
ALTER TABLE "template_planned_product" RENAME CONSTRAINT "flooring_template_item_pkey" TO "template_planned_product_pkey";

-- 8) template_planned_product: indexes.
ALTER INDEX "flooring_template_item_templateId_idx"           RENAME TO "template_planned_product_templateId_idx";
ALTER INDEX "flooring_template_item_templateId_createdAt_idx" RENAME TO "template_planned_product_templateId_createdAt_idx";
ALTER INDEX "flooring_template_item_productId_idx"            RENAME TO "template_planned_product_productId_idx";
ALTER INDEX "flooring_template_item_unitId_idx"               RENAME TO "template_planned_product_unitId_idx";

-- 9) template_planned_product: foreign-key constraints.
ALTER TABLE "template_planned_product" RENAME CONSTRAINT "flooring_template_item_templateId_fkey" TO "template_planned_product_templateId_fkey";
ALTER TABLE "template_planned_product" RENAME CONSTRAINT "flooring_template_item_productId_fkey"  TO "template_planned_product_productId_fkey";
ALTER TABLE "template_planned_product" RENAME CONSTRAINT "flooring_template_item_unitId_fkey"     TO "template_planned_product_unitId_fkey";

-- 10) Third table: soft-ref column + its index (no FK constraint on this column).
ALTER TABLE "flooring_work_order_item" RENAME COLUMN "sourceTemplateItemId" TO "sourceTemplatePlannedProductId";
ALTER INDEX "flooring_work_order_item_sourceTemplateItemId_idx" RENAME TO "flooring_work_order_item_sourceTemplatePlannedProductId_idx";
