-- Entity name (`entity.entity`) indexes. The column previously had NO index at
-- all, despite being both sorted and searched.
--
-- btree: backs the work-orders list sort by entity name (2-hop relation sort
--   property.entity.entity). The WO `id` tiebreak lives on flooring_work_order,
--   a different table, so this is a plain btree, not a (col, id) composite.
-- GIN trigram: backs the entity list + picker name search (ILIKE `contains`,
--   case-insensitive) — the per-keystroke search was a full sequential scan.
-- pg_trgm is already in use by the other gin_trgm_ops indexes, so no extension
-- step is needed.
CREATE INDEX "entity_entity_idx" ON "entity"("entity");
CREATE INDEX "entity_entity_trgm_idx" ON "entity" USING gin ("entity" gin_trgm_ops);
