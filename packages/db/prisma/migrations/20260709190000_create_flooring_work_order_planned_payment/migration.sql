-- =====================================================================
-- flooring_work_order_planned_payment: a work order's PLANNED payments
-- (per-job payment plan).
--
-- Field-shape mirrors `template_planned_payment` (unsigned `amount` +
-- `direction`, with direction carrying the sign; optional entity link),
-- structure mirrors the work-order child tables (Cascade off the work order,
-- actor + timestamp pair).
--
--   • `workOrderId` -> flooring_work_order (CASCADE: planned payments die with the WO)
--   • `entityId`    -> entity (SET NULL: clearing the linked entity leaves the row unlinked)
--   • `direction`   reuses the existing "FlooringPaymentDirection" enum (no CREATE TYPE)
--   • Indexes: workOrderId, workOrderId+createdAt, entityId (mirrors the sibling child tables).
--
-- NOTE: these columns have NO @map, so their real names are camelCase and MUST
-- be double-quoted — an unquoted identifier folds to lowercase.
-- =====================================================================

-- CreateTable
CREATE TABLE "flooring_work_order_planned_payment" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "direction" "FlooringPaymentDirection" NOT NULL,
    "notes" VARCHAR(30),
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "flooring_work_order_planned_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flooring_work_order_planned_payment_workOrderId_idx" ON "flooring_work_order_planned_payment"("workOrderId");

-- CreateIndex
CREATE INDEX "flooring_work_order_planned_payment_workOrderId_createdAt_idx" ON "flooring_work_order_planned_payment"("workOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "flooring_work_order_planned_payment_entityId_idx" ON "flooring_work_order_planned_payment"("entityId");

-- AddForeignKey
ALTER TABLE "flooring_work_order_planned_payment" ADD CONSTRAINT "flooring_work_order_planned_payment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_planned_payment" ADD CONSTRAINT "flooring_work_order_planned_payment_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
