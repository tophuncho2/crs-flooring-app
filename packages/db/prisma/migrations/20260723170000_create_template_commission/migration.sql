-- Template commissions: a sales-rep commission line item on a template — the THIRD
-- table in the "products" record section (saved in the same atomic diff as
-- template_planned_product + template_service_item).
--
-- entityId: optional link to the sales rep (SetNull; label-only, does not drive math).
-- percent:  manual scale-3 percent (mirrors template.taxRate), nullable (NULL = unset).
-- Line total (percent × the template's Net Cost) is derived, never stored.
CREATE TABLE "template_commission" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "entityId" TEXT,
    "percent" DECIMAL(6,3),
    "notes" VARCHAR(30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "template_commission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "template_commission_templateId_idx" ON "template_commission"("templateId");
CREATE INDEX "template_commission_templateId_createdAt_idx" ON "template_commission"("templateId", "createdAt");
CREATE INDEX "template_commission_entityId_idx" ON "template_commission"("entityId");

ALTER TABLE "template_commission"
    ADD CONSTRAINT "template_commission_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "template_commission"
    ADD CONSTRAINT "template_commission_entityId_fkey"
    FOREIGN KEY ("entityId") REFERENCES "entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
