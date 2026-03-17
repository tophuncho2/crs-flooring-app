-- DropForeignKey
ALTER TABLE "flooring_property_management" DROP CONSTRAINT "flooring_property_management_managementCompanyId_fkey";

-- DropForeignKey
ALTER TABLE "flooring_property_management" DROP CONSTRAINT "flooring_property_management_propertyId_fkey";

-- AlterTable
ALTER TABLE "flooring_category" ADD COLUMN     "serviceUnitId" TEXT;

-- AlterTable
ALTER TABLE "flooring_template_item" ADD COLUMN     "unitPrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "flooring_work_order_item" ADD COLUMN     "unitPrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "property_hub" ADD COLUMN     "managementCompanyId" TEXT;

-- Ensure a fallback management company exists before the new direct property relation is enforced.
INSERT INTO "flooring_management_company" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Unassigned', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM "flooring_management_company"
    WHERE "name" = 'Unassigned'
);

-- Backfill the new direct property -> management company relation from the old join table.
UPDATE "property_hub" AS p
SET "managementCompanyId" = pm."managementCompanyId"
FROM "flooring_property_management" AS pm
WHERE p."id" = pm."propertyId";

-- Any property without a prior link is assigned to the fallback company so the new NOT NULL rule is valid.
UPDATE "property_hub"
SET "managementCompanyId" = (
    SELECT "id"
    FROM "flooring_management_company"
    WHERE "name" = 'Unassigned'
    LIMIT 1
)
WHERE "managementCompanyId" IS NULL;

-- Backfill row-level prices from the existing product cost where possible.
UPDATE "flooring_template_item" AS item
SET "unitPrice" = COALESCE(product."cost", 0)
FROM "flooring_product" AS product
WHERE item."productId" = product."id";

UPDATE "flooring_work_order_item" AS item
SET "unitPrice" = COALESCE(product."cost", 0)
FROM "flooring_product" AS product
WHERE item."productId" = product."id";

ALTER TABLE "flooring_template_item" ALTER COLUMN "unitPrice" SET NOT NULL;
ALTER TABLE "flooring_work_order_item" ALTER COLUMN "unitPrice" SET NOT NULL;
ALTER TABLE "property_hub" ALTER COLUMN "managementCompanyId" SET NOT NULL;

-- DropTable
DROP TABLE "flooring_property_management";

-- CreateTable
CREATE TABLE "flooring_service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseCost" DECIMAL(10,2) NOT NULL,
    "unitId" TEXT NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_template_service_item" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "serviceId" TEXT,
    "name" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_template_service_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_work_order_service_item" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "serviceId" TEXT,
    "name" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_work_order_service_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_analytics" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "totalMaterialCost" DECIMAL(12,2) NOT NULL,
    "totalServiceCost" DECIMAL(12,2) NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_analytics_pkey" PRIMARY KEY ("id")
);

-- Seed analytics for existing work orders using the newly backfilled material prices.
INSERT INTO "flooring_analytics" ("id", "workOrderId", "totalMaterialCost", "totalServiceCost", "totalCost", "createdAt")
SELECT
    gen_random_uuid(),
    wo."id",
    COALESCE(material_totals."totalMaterialCost", 0),
    0,
    COALESCE(material_totals."totalMaterialCost", 0),
    CURRENT_TIMESTAMP
FROM "flooring_work_order" AS wo
LEFT JOIN (
    SELECT
        "workOrderId",
        SUM("quantity" * "unitPrice") AS "totalMaterialCost"
    FROM "flooring_work_order_item"
    GROUP BY "workOrderId"
) AS material_totals
    ON material_totals."workOrderId" = wo."id";

-- CreateIndex
CREATE INDEX "flooring_service_name_idx" ON "flooring_service"("name");

-- CreateIndex
CREATE INDEX "flooring_service_unitId_idx" ON "flooring_service"("unitId");

-- CreateIndex
CREATE INDEX "flooring_template_service_item_templateId_idx" ON "flooring_template_service_item"("templateId");

-- CreateIndex
CREATE INDEX "flooring_template_service_item_serviceId_idx" ON "flooring_template_service_item"("serviceId");

-- CreateIndex
CREATE INDEX "flooring_template_service_item_unitId_idx" ON "flooring_template_service_item"("unitId");

-- CreateIndex
CREATE INDEX "flooring_work_order_service_item_workOrderId_idx" ON "flooring_work_order_service_item"("workOrderId");

-- CreateIndex
CREATE INDEX "flooring_work_order_service_item_serviceId_idx" ON "flooring_work_order_service_item"("serviceId");

-- CreateIndex
CREATE INDEX "flooring_work_order_service_item_unitId_idx" ON "flooring_work_order_service_item"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_analytics_workOrderId_key" ON "flooring_analytics"("workOrderId");

-- CreateIndex
CREATE INDEX "flooring_analytics_workOrderId_idx" ON "flooring_analytics"("workOrderId");

-- CreateIndex
CREATE INDEX "flooring_category_serviceUnitId_idx" ON "flooring_category"("serviceUnitId");

-- CreateIndex
CREATE INDEX "property_hub_managementCompanyId_idx" ON "property_hub"("managementCompanyId");

-- AddForeignKey
ALTER TABLE "property_hub" ADD CONSTRAINT "property_hub_managementCompanyId_fkey" FOREIGN KEY ("managementCompanyId") REFERENCES "flooring_management_company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_category" ADD CONSTRAINT "flooring_category_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_service" ADD CONSTRAINT "flooring_service_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template_service_item" ADD CONSTRAINT "flooring_template_service_item_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "flooring_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template_service_item" ADD CONSTRAINT "flooring_template_service_item_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "flooring_service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template_service_item" ADD CONSTRAINT "flooring_template_service_item_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_service_item" ADD CONSTRAINT "flooring_work_order_service_item_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_service_item" ADD CONSTRAINT "flooring_work_order_service_item_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "flooring_service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_service_item" ADD CONSTRAINT "flooring_work_order_service_item_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_analytics" ADD CONSTRAINT "flooring_analytics_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
