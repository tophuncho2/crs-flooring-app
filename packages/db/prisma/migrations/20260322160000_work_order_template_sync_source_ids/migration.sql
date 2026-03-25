ALTER TABLE "flooring_work_order"
ADD COLUMN "templateSyncedAt" TIMESTAMP(3),
ADD COLUMN "templateSyncMode" TEXT,
ADD COLUMN "templateSnapshotHash" TEXT;

ALTER TABLE "flooring_work_order_item"
ADD COLUMN "sourceTemplateItemId" TEXT;

ALTER TABLE "flooring_work_order_service_item"
ADD COLUMN "sourceTemplateServiceItemId" TEXT;

CREATE INDEX "flooring_work_order_item_sourceTemplateItemId_idx"
ON "flooring_work_order_item"("sourceTemplateItemId");

CREATE INDEX "flooring_work_order_service_item_sourceTemplateServiceItemId_idx"
ON "flooring_work_order_service_item"("sourceTemplateServiceItemId");
