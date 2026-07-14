-- =====================================================================
-- TemplatePlannedPayment + FlooringWorkOrderPlannedPayment:
-- add an optional link to a FlooringPaymentPurpose.
--
-- A planned payment may be tagged with exactly one purpose, nullable.
-- FK SET NULL on delete (mirrors the existing entityId link on these same
-- tables): deleting the purpose leaves the planned payment intact, unlinked.
--
-- Nullable, no backfill: existing rows have no link → paymentPurposeId NULL.
--
-- NOTE: neither planned_payment table @maps these columns, so the real names
-- are camelCase and MUST be double-quoted — an unquoted identifier folds to
-- lowercase.
-- =====================================================================

-- AlterTable
ALTER TABLE "template_planned_payment" ADD COLUMN "paymentPurposeId" TEXT;
ALTER TABLE "flooring_work_order_planned_payment" ADD COLUMN "paymentPurposeId" TEXT;

-- CreateIndex
CREATE INDEX "template_planned_payment_paymentPurposeId_idx" ON "template_planned_payment"("paymentPurposeId");
CREATE INDEX "flooring_work_order_planned_payment_paymentPurposeId_idx" ON "flooring_work_order_planned_payment"("paymentPurposeId");

-- AddForeignKey
ALTER TABLE "template_planned_payment" ADD CONSTRAINT "template_planned_payment_paymentPurposeId_fkey" FOREIGN KEY ("paymentPurposeId") REFERENCES "flooring_payment_purpose"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "flooring_work_order_planned_payment" ADD CONSTRAINT "flooring_work_order_planned_payment_paymentPurposeId_fkey" FOREIGN KEY ("paymentPurposeId") REFERENCES "flooring_payment_purpose"("id") ON DELETE SET NULL ON UPDATE CASCADE;
