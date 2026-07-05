-- =====================================================================
-- template_invoice_item: a template's INVOICE items. A structural
-- mirror of `template_planned_payment` (own table so the two payment plans
-- stay independently editable), but a DELIBERATELY SMALLER shape:
--
--   • amount · direction · notes only — NO paymentDate, NO entity link (no FK
--     beyond the parent template).
--   • `templateId` -> template (CASCADE: invoice items die with the template)
--   • `direction` reuses the existing "FlooringPaymentDirection" enum (no CREATE TYPE)
--   • Indexes: templateId, templateId+createdAt (mirrors the sibling child tables).
-- =====================================================================

-- CreateTable
CREATE TABLE "template_invoice_item" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "direction" "FlooringPaymentDirection" NOT NULL,
    "notes" VARCHAR(30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "template_invoice_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "template_invoice_item_templateId_idx" ON "template_invoice_item"("templateId");

-- CreateIndex
CREATE INDEX "template_invoice_item_templateId_createdAt_idx" ON "template_invoice_item"("templateId", "createdAt");

-- AddForeignKey
ALTER TABLE "template_invoice_item" ADD CONSTRAINT "template_invoice_item_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
