-- =====================================================================
-- Entity ⇄ Entity Type link: explicit many-to-many join table.
--
-- Adds `entity_entity_type`, the join between `entity` and
-- `flooring_entity_type`. An entity may carry several types; a type may tag
-- many entities. Explicit join (not a Prisma implicit m-n) to match the
-- codebase's explicit-FK style and leave room for future metadata/order.
--
--   • `@@unique(entityId, entityTypeId)` — one link row per (entity, type) pair;
--     powers the link-replace-on-save (deleteMany + createMany) idempotently.
--   • Both FKs cascade-delete the link row when either side is removed.
--   • Index on `entityTypeId` for the reverse lookup (FK already covers entityId
--     via the composite unique's leading column).
-- =====================================================================

-- CreateTable
CREATE TABLE "entity_entity_type" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_entity_type_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entity_entity_type_entityId_entityTypeId_key" ON "entity_entity_type"("entityId", "entityTypeId");

-- CreateIndex
CREATE INDEX "entity_entity_type_entityTypeId_idx" ON "entity_entity_type"("entityTypeId");

-- AddForeignKey
ALTER TABLE "entity_entity_type" ADD CONSTRAINT "entity_entity_type_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_entity_type" ADD CONSTRAINT "entity_entity_type_entityTypeId_fkey" FOREIGN KEY ("entityTypeId") REFERENCES "flooring_entity_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;
