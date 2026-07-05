-- =====================================================================
-- template_planned_payment: a template's PLANNED payments (payment plan).
--
-- Field-shape mirrors `flooring_payment` (unsigned `amount` + `direction`,
-- with direction carrying the sign; nullable `paymentDate`), structure mirrors
-- the template child tables (Cascade off the template, actor + timestamp pair).
--
--   • `templateId` -> template (CASCADE: planned payments die with the template)
--   • `direction`  reuses the existing "FlooringPaymentDirection" enum (no CREATE TYPE)
--   • The entity link + no-row#/color are deferred to a later pass.
--   • Indexes: templateId, templateId+createdAt (mirrors the sibling child tables).
-- =====================================================================

-- CreateTable
CREATE TABLE "template_planned_payment" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "direction" "FlooringPaymentDirection" NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "template_planned_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "template_planned_payment_templateId_idx" ON "template_planned_payment"("templateId");

-- CreateIndex
CREATE INDEX "template_planned_payment_templateId_createdAt_idx" ON "template_planned_payment"("templateId", "createdAt");

-- AddForeignKey
ALTER TABLE "template_planned_payment" ADD CONSTRAINT "template_planned_payment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
