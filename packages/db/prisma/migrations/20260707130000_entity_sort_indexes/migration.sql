-- Entities list-view sort indexes (menu-only multi-column sort).
-- Composite `(col, id)` so the `id` tiebreak resolves in the same index scan;
-- the sort builder propagates the lead direction to the tiebreak, so one
-- uniform-direction btree serves both ASC and DESC via backward scan.
--
-- `entity` (name sort) + `entityNumberInt` were already indexed. createdAt /
-- updatedAt were unindexed and are tie-prone under bulk import, so each gets a
-- backing btree. `state` is a nullable low-cardinality scalar now offered in the
-- sort menu; a plain btree serves the ASC-nulls-last case cleanly.
CREATE INDEX "entity_createdAt_id_idx" ON "entity"("createdAt", "id");
CREATE INDEX "entity_updatedAt_id_idx" ON "entity"("updatedAt", "id");
CREATE INDEX "entity_state_id_idx" ON "entity"("state", "id");
