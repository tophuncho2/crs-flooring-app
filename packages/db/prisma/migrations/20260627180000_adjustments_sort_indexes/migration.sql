-- Adjustments ledger list-view sort indexes (menu-only multi-column sort).
-- Composite `(col, id)` so the `id` tiebreak resolves in the same index scan;
-- the sort builder propagates the lead direction to the tiebreak, so one
-- uniform-direction btree serves both ASC and DESC via backward scan.
--
-- createdAt already has `(createdAt, id)` (the default ledger order) and the
-- warehouse-filtered `(warehouseId, createdAt, id)`; productName sort rides the
-- FlooringProduct.name index. updatedAt was unindexed; location had only a
-- GIN-trgm index (ILIKE search, not ORDER BY). createdAt/updatedAt are tie-prone
-- under bulk import / worker materialize, so the id tiebreak genuinely runs.
CREATE INDEX "flooring_inventory_adjustment_updatedAt_id_idx" ON "flooring_inventory_adjustment"("updatedAt", "id");
CREATE INDEX "flooring_inventory_adjustment_location_id_idx" ON "flooring_inventory_adjustment"("location", "id");
