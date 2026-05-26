-- Cut-logs ledger list view indexes.
-- pg_trgm is already enabled (20260521044911_enable_pg_trgm), so no CREATE EXTENSION here.

-- CreateIndex
CREATE INDEX "flooring_cut_log_warehouseId_createdAt_id_idx" ON "flooring_cut_log"("warehouseId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "flooring_cut_log_createdAt_id_idx" ON "flooring_cut_log"("createdAt", "id");

-- CreateIndex
CREATE INDEX "flooring_cut_log_inventoryItem_trgm_idx" ON "flooring_cut_log" USING GIN ("inventoryItem" gin_trgm_ops);
