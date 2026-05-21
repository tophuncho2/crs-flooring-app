-- CreateIndex
CREATE INDEX "flooring_import_entry_purchaseOrderNumber_trgm_idx" ON "flooring_import_entry" USING GIN ("purchaseOrderNumber" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "flooring_inventory_warehouseId_importNumber_idx" ON "flooring_inventory"("warehouseId", "importNumber");

-- CreateIndex
CREATE INDEX "flooring_inventory_warehouseId_purchaseOrderNumber_idx" ON "flooring_inventory"("warehouseId", "purchaseOrderNumber");

-- CreateIndex
CREATE INDEX "flooring_inventory_inventory_number_trgm_idx" ON "flooring_inventory" USING GIN ("inventory_number" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "flooring_inventory_rollNumber_trgm_idx" ON "flooring_inventory" USING GIN ("rollNumber" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "flooring_inventory_dyeLot_trgm_idx" ON "flooring_inventory" USING GIN ("dyeLot" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "flooring_inventory_note_trgm_idx" ON "flooring_inventory" USING GIN ("note" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "flooring_inventory_location_trgm_idx" ON "flooring_inventory" USING GIN ("location" gin_trgm_ops);
