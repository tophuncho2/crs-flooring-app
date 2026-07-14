-- =====================================================================
-- FlooringPayment: add an optional link to a FlooringPaymentPurpose.
--
-- A payment may be tagged with exactly one purpose, nullable. FK SET NULL
-- on delete (mirrors the existing entityId/workOrderId links on this same
-- table): deleting the purpose leaves the payment intact, unlinked.
--
-- Nullable, no backfill: existing rows have no link → paymentPurposeId NULL.
--
-- NOTE: FlooringPayment does not @map this column, so the real name is
-- camelCase and MUST be double-quoted — an unquoted identifier folds to
-- lowercase. Mirrors migration 20260714140000 (planned-payment tables).
-- =====================================================================

-- AlterTable
ALTER TABLE "flooring_payment" ADD COLUMN "paymentPurposeId" TEXT;

-- CreateIndex
CREATE INDEX "flooring_payment_paymentPurposeId_idx" ON "flooring_payment"("paymentPurposeId");

-- AddForeignKey
ALTER TABLE "flooring_payment" ADD CONSTRAINT "flooring_payment_paymentPurposeId_fkey" FOREIGN KEY ("paymentPurposeId") REFERENCES "flooring_payment_purpose"("id") ON DELETE SET NULL ON UPDATE CASCADE;
