CREATE INDEX "flooring_work_order_purchaseOrderNumber_trgm_idx" ON "flooring_work_order" USING GIN ("purchaseOrderNumber" gin_trgm_ops);
