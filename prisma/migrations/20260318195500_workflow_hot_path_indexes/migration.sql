CREATE INDEX IF NOT EXISTS "flooring_template_createdAt_idx" ON "flooring_template"("createdAt");
CREATE INDEX IF NOT EXISTS "flooring_template_updatedAt_idx" ON "flooring_template"("updatedAt");

CREATE INDEX IF NOT EXISTS "flooring_template_item_templateId_createdAt_idx" ON "flooring_template_item"("templateId", "createdAt");
CREATE INDEX IF NOT EXISTS "flooring_template_service_item_templateId_createdAt_idx" ON "flooring_template_service_item"("templateId", "createdAt");

CREATE INDEX IF NOT EXISTS "flooring_work_order_status_scheduledFor_idx" ON "flooring_work_order"("status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "flooring_work_order_createdAt_idx" ON "flooring_work_order"("createdAt");
CREATE INDEX IF NOT EXISTS "flooring_work_order_updatedAt_idx" ON "flooring_work_order"("updatedAt");
CREATE INDEX IF NOT EXISTS "flooring_work_order_templateId_idx" ON "flooring_work_order"("templateId");
CREATE INDEX IF NOT EXISTS "flooring_work_order_warehouseId_idx" ON "flooring_work_order"("warehouseId");

CREATE INDEX IF NOT EXISTS "flooring_work_order_item_workOrderId_createdAt_idx" ON "flooring_work_order_item"("workOrderId", "createdAt");
CREATE INDEX IF NOT EXISTS "flooring_work_order_service_item_workOrderId_createdAt_idx" ON "flooring_work_order_service_item"("workOrderId", "createdAt");
