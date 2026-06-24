-- =====================================================================
-- FlooringPayment: add optional links to a work order and an entity.
--
-- A payment may be tied to exactly one work order and one entity, both
-- nullable. Rule: material-outflow payments link to import/inventory, never
-- directly to a work order — so the WO link MUST stay optional (never NOT NULL).
-- Both FKs SET NULL on delete (mirrors Property.entityId): clearing the linked
-- row leaves the payment intact and unlinked.
--
-- Nullable, no backfill: existing payment rows have no link → both columns NULL.
--
-- NOTE: `flooring_payment` columns have NO @map, so their real names are
-- camelCase and MUST be double-quoted — an unquoted identifier folds to lowercase.
-- =====================================================================

-- AlterTable
ALTER TABLE "flooring_payment" ADD COLUMN "entityId" TEXT;
ALTER TABLE "flooring_payment" ADD COLUMN "workOrderId" TEXT;

-- CreateIndex
CREATE INDEX "flooring_payment_entityId_idx" ON "flooring_payment"("entityId");

-- CreateIndex
CREATE INDEX "flooring_payment_workOrderId_idx" ON "flooring_payment"("workOrderId");

-- AddForeignKey
ALTER TABLE "flooring_payment" ADD CONSTRAINT "flooring_payment_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_payment" ADD CONSTRAINT "flooring_payment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
