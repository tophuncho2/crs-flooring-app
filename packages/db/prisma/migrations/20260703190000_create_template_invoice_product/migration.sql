-- =====================================================================
-- template_invoice_product: products placed onto a template's INVOICE.
--
-- A structural mirror of `template_planned_product` (same columns) kept as a
-- SEPARATE table so invoice rows can grow invoice-specific columns (e.g.
-- `cost`) in a later pass without disturbing planned products. Byte-identical
-- to planned products today; the separation is the whole point.
--
--   • `templateId`  -> template            (CASCADE: invoice rows die with the template)
--   • `productId`   -> flooring_product     (RESTRICT: a product in use can't be deleted)
--   • `unitId`      -> flooring_unit_of_measure (RESTRICT, nullable: the row's own editable unit FK)
--   • Actor pair (createdBy/updatedBy) + timestamp pair mirror the planned table.
--   • Indexes mirror the planned table exactly (templateId, templateId+createdAt,
--     productId, unitId).
-- =====================================================================

-- CreateTable
CREATE TABLE "template_invoice_product" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2),
    "unitId" TEXT,
    "notes" VARCHAR(30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "template_invoice_product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "template_invoice_product_templateId_idx" ON "template_invoice_product"("templateId");

-- CreateIndex
CREATE INDEX "template_invoice_product_templateId_createdAt_idx" ON "template_invoice_product"("templateId", "createdAt");

-- CreateIndex
CREATE INDEX "template_invoice_product_productId_idx" ON "template_invoice_product"("productId");

-- CreateIndex
CREATE INDEX "template_invoice_product_unitId_idx" ON "template_invoice_product"("unitId");

-- AddForeignKey
ALTER TABLE "template_invoice_product" ADD CONSTRAINT "template_invoice_product_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_invoice_product" ADD CONSTRAINT "template_invoice_product_productId_fkey" FOREIGN KEY ("productId") REFERENCES "flooring_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_invoice_product" ADD CONSTRAINT "template_invoice_product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
