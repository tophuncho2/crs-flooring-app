-- =====================================================================
-- Entity → FlooringEntityType: replace the many-to-many join
-- (entity_entity_type) with ONE nullable direct FK on the entity.
--
-- The business reality is that an entity carries AT MOST ONE type, so the
-- M2M was over-modelled. New column entity.entity_type_id, nullable, FK
-- SET NULL on type delete (deleting a type silently unassigns it — no
-- in-use guard, explicit product choice).
--
-- Backfill: each entity keeps the ALPHABETICALLY-FIRST of its old linked
-- types (ORDER BY type ASC — matches the prior read-repo orderBy). Any
-- extra types an entity carried are dropped. Then the join table is gone.
--
-- NOTE: entity_entity_type's columns are NOT @map'd — they are camelCase
-- and MUST be double-quoted ("entityId", "entityTypeId") or an unquoted
-- identifier folds to lowercase.
-- =====================================================================

-- AlterTable: add the nullable FK column
ALTER TABLE "entity" ADD COLUMN "entity_type_id" TEXT;

-- Backfill: alphabetically-first linked type per entity
UPDATE "entity" e SET "entity_type_id" = sub."entityTypeId"
FROM (
  SELECT DISTINCT ON (j."entityId") j."entityId", j."entityTypeId"
  FROM "entity_entity_type" j
  JOIN "flooring_entity_type" t ON t.id = j."entityTypeId"
  ORDER BY j."entityId", t.type ASC
) sub
WHERE e.id = sub."entityId";

-- AddForeignKey
ALTER TABLE "entity" ADD CONSTRAINT "entity_entity_type_id_fkey" FOREIGN KEY ("entity_type_id") REFERENCES "flooring_entity_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "entity_entity_type_id_idx" ON "entity"("entity_type_id");

-- DropTable: retire the join
DROP TABLE "entity_entity_type";
