-- Sort-column btree indexes for the menu-only list-view sort.
-- Composite `(col, id)` so the `id` tiebreak resolves in the same index scan;
-- the sort builder propagates the primary direction to the tiebreak, so one
-- uniform-direction btree serves both ASC and DESC via backward scan.

-- Inventory: createdAt backs the DEFAULT list ordering (createdAt DESC, id DESC);
-- updatedAt was unindexed; location had only a GIN-trgm index (ILIKE search, not
-- ORDER BY) and is only ever sorted with warehouse filtered first, so the
-- composite leads with warehouseId. createdAt/updatedAt are tie-prone under bulk
-- import/worker-materialize, so the id tiebreak genuinely runs.
CREATE INDEX "flooring_inventory_createdAt_id_idx" ON "flooring_inventory"("createdAt", "id");
CREATE INDEX "flooring_inventory_warehouseId_location_id_idx" ON "flooring_inventory"("warehouseId", "location", "id");
CREATE INDEX "flooring_inventory_updatedAt_id_idx" ON "flooring_inventory"("updatedAt", "id");

-- Inventory stockQuantity: upgrade the existing single-column index to fold the
-- id tiebreak into the same scan (quantities are tie-prone — many rows share 0 /
-- the same value).
DROP INDEX "flooring_inventory_stockQuantity_idx";
CREATE INDEX "flooring_inventory_stockQuantity_id_idx" ON "flooring_inventory"("stockQuantity", "id");

-- Work orders unitType: the only WO sort column with no btree (it had just a
-- GIN-trgm index, which serves ILIKE search, not ORDER BY).
CREATE INDEX "flooring_work_order_unitType_id_idx" ON "flooring_work_order"("unitType", "id");
