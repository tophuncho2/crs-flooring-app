-- Per-field identity search for the adjustments list-view toolbar. The single
-- search box is being split into four field-scoped search bars (Inv #, Roll #,
-- Dye lot, Note). Each bar ILIKEs its own frozen snapshot column on
-- flooring_inventory_adjustment, so each column gets a GIN trigram index
-- (pg_trgm already enabled). These columns are immutable post-create, so the
-- indexes are insert-only — mirrors the flooring_inventory identity trgm indexes.
CREATE INDEX "flooring_inventory_adjustment_inventoryNumber_trgm_idx" ON "flooring_inventory_adjustment" USING GIN ("inventoryNumber" gin_trgm_ops);

CREATE INDEX "flooring_inventory_adjustment_rollNumber_trgm_idx" ON "flooring_inventory_adjustment" USING GIN ("rollNumber" gin_trgm_ops);

CREATE INDEX "flooring_inventory_adjustment_dyeLot_trgm_idx" ON "flooring_inventory_adjustment" USING GIN ("dyeLot" gin_trgm_ops);

CREATE INDEX "flooring_inventory_adjustment_inventoryNote_trgm_idx" ON "flooring_inventory_adjustment" USING GIN ("inventoryNote" gin_trgm_ops);
