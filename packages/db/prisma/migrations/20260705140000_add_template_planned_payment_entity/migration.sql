-- =====================================================================
-- TemplatePlannedPayment: add an optional link to an Entity.
--
-- A planned payment may be tied to exactly one entity (vendor/customer/etc.),
-- nullable. FK SET NULL on delete (mirrors FlooringPayment.entityId): clearing
-- the linked entity leaves the planned payment intact and unlinked.
--
-- Nullable, no backfill: existing rows have no link → entityId NULL.
--
-- NOTE: `template_planned_payment` columns have NO @map, so their real names are
-- camelCase and MUST be double-quoted — an unquoted identifier folds to lowercase.
-- =====================================================================

-- AlterTable
ALTER TABLE "template_planned_payment" ADD COLUMN "entityId" TEXT;

-- CreateIndex
CREATE INDEX "template_planned_payment_entityId_idx" ON "template_planned_payment"("entityId");

-- AddForeignKey
ALTER TABLE "template_planned_payment" ADD CONSTRAINT "template_planned_payment_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
