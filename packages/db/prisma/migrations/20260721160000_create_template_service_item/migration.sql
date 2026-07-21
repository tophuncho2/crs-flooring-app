-- CreateTable
CREATE TABLE "template_service_item" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "itemType" VARCHAR(40),
    "itemName" VARCHAR(80),
    "quantity" DECIMAL(10,2),
    "unitId" TEXT,
    "bidCost" DECIMAL(12,2),
    "unitPrice" DECIMAL(12,2),
    "tax" DECIMAL(12,2),
    "freight" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "template_service_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "template_service_item_templateId_idx" ON "template_service_item"("templateId");

-- CreateIndex
CREATE INDEX "template_service_item_templateId_createdAt_idx" ON "template_service_item"("templateId", "createdAt");

-- CreateIndex
CREATE INDEX "template_service_item_unitId_idx" ON "template_service_item"("unitId");

-- AddForeignKey
ALTER TABLE "template_service_item" ADD CONSTRAINT "template_service_item_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_service_item" ADD CONSTRAINT "template_service_item_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
