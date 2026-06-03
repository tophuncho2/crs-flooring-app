-- CreateIndex
CREATE INDEX "flooring_work_order_unitType_trgm_idx" ON "flooring_work_order" USING GIN ("unitType" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "flooring_work_order_unitNumber_trgm_idx" ON "flooring_work_order" USING GIN ("unitNumber" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "flooring_work_order_work_order_number_trgm_idx" ON "flooring_work_order" USING GIN ("work_order_number" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "flooring_work_order_description_trgm_idx" ON "flooring_work_order" USING GIN ("description" gin_trgm_ops);
