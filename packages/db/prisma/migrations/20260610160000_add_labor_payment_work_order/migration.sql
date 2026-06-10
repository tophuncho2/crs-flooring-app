-- =====================================================================
-- Labor Payments: optional link to a work order.
--
-- Adds the nullable `workOrderId` FK on `flooring_labor_payment`. A labor
-- payment may reference at most one `flooring_work_order`; the link is
-- optional and ungated. ON DELETE SET NULL so deleting a work order clears
-- the reference instead of blocking the delete (mirrors the work order's own
-- optional FKs: template/jobType/warehouse). The workOrderId index backs FK
-- lookups and the list-view "Work Order" column.
-- =====================================================================

-- AlterTable
ALTER TABLE "flooring_labor_payment" ADD COLUMN "workOrderId" TEXT;

-- CreateIndex
CREATE INDEX "flooring_labor_payment_workOrderId_idx" ON "flooring_labor_payment"("workOrderId");

-- AddForeignKey
ALTER TABLE "flooring_labor_payment" ADD CONSTRAINT "flooring_labor_payment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
