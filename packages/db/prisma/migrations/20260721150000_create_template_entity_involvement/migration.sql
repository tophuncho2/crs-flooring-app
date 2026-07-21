-- =====================================================================
-- Template Entity Involvement: why an entity is involved in a template.
--
-- Adds `template_entity_involvement` — a diff-save child section on the
-- template, mirroring `flooring_work_order_entity_involvement`. Links an Entity
-- plus a free-text `involvementType` (the reason the entity is involved,
-- separate from the entity's own type). Carries forward to a synced work order.
--   • `templateId`      — FK → template, ON DELETE CASCADE.
--   • `entityId`        — FK → entity, ON DELETE SET NULL (the entity may later
--     be deleted; the involvement row survives with a null link).
--   • `involvementType` — free-text reason, VARCHAR(40), nullable.
--   • `createdBy/updatedBy` — actor-email columns (nullable, no FK).
-- The short table name keeps the default Prisma index names under Postgres'
-- 63-byte identifier limit, so no short-name overrides are needed.
-- =====================================================================

-- CreateTable
CREATE TABLE "template_entity_involvement" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "entityId" TEXT,
    "involvementType" VARCHAR(40),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "template_entity_involvement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "template_entity_involvement_templateId_idx" ON "template_entity_involvement"("templateId");

-- CreateIndex
CREATE INDEX "template_entity_involvement_templateId_createdAt_idx" ON "template_entity_involvement"("templateId", "createdAt");

-- CreateIndex
CREATE INDEX "template_entity_involvement_entityId_idx" ON "template_entity_involvement"("entityId");

-- AddForeignKey
ALTER TABLE "template_entity_involvement" ADD CONSTRAINT "template_entity_involvement_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_entity_involvement" ADD CONSTRAINT "template_entity_involvement_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
