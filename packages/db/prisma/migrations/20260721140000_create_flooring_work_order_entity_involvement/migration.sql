-- =====================================================================
-- Work-Order Entity Involvement: why an entity is involved in a work order.
--
-- Adds `flooring_work_order_entity_involvement` — a diff-save child section on
-- the work order. Links an Entity plus a free-text `involvementType` (the reason
-- the entity is involved, separate from the entity's own type). Mirrors the
-- WO-child convention (Cascade off the work order + actor + timestamp pair).
--   • `workOrderId`     — FK → flooring_work_order, ON DELETE CASCADE.
--   • `entityId`        — FK → entity, ON DELETE SET NULL (the entity may later
--     be deleted; the involvement row survives with a null link).
--   • `involvementType` — free-text reason, VARCHAR(40), nullable.
--   • `createdBy/updatedBy` — actor-email columns (nullable, no FK).
-- Index names use the `fwoei_` prefix — the default Prisma names would exceed
-- Postgres' 63-byte identifier limit and truncate.
-- =====================================================================

-- CreateTable
CREATE TABLE "flooring_work_order_entity_involvement" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "entityId" TEXT,
    "involvementType" VARCHAR(40),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "flooring_work_order_entity_involvement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fwoei_work_order_idx" ON "flooring_work_order_entity_involvement"("workOrderId");

-- CreateIndex
CREATE INDEX "fwoei_work_order_created_at_idx" ON "flooring_work_order_entity_involvement"("workOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "fwoei_entity_idx" ON "flooring_work_order_entity_involvement"("entityId");

-- AddForeignKey
ALTER TABLE "flooring_work_order_entity_involvement" ADD CONSTRAINT "flooring_work_order_entity_involvement_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_entity_involvement" ADD CONSTRAINT "flooring_work_order_entity_involvement_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
