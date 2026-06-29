-- Properties list-view + record-view sort indexes (menu-only multi-column sort).
-- Composite `(col, id)` so the `id` tiebreak resolves in the same index scan;
-- the sort builder propagates the lead direction to the tiebreak, so one
-- uniform-direction btree serves both ASC and DESC via backward scan.
--
-- `name` / `propertyNumberInt` / `entityId` were already indexed (name + entity
-- sorts ride those; entity-name sort rides Entity.entity). createdAt/updatedAt
-- were unindexed and are now sortable on the list AND the canonical newest-first
-- order of the entity record-view properties section, so each gets a backing
-- btree. They are tie-prone under bulk import, so the id tiebreak genuinely runs.
CREATE INDEX "property_hub_createdAt_id_idx" ON "property_hub"("createdAt", "id");
CREATE INDEX "property_hub_updatedAt_id_idx" ON "property_hub"("updatedAt", "id");
