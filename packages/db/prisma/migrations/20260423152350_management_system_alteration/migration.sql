-- DropForeignKey
ALTER TABLE "flooring_template" DROP CONSTRAINT "flooring_template_padProductId_fkey";

-- DropForeignKey
ALTER TABLE "flooring_template_sales_rep" DROP CONSTRAINT "flooring_template_sales_rep_contactId_fkey";

-- DropForeignKey
ALTER TABLE "flooring_template_sales_rep" DROP CONSTRAINT "flooring_template_sales_rep_templateId_fkey";

-- DropForeignKey
ALTER TABLE "flooring_template_service_item" DROP CONSTRAINT "flooring_template_service_item_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "flooring_template_service_item" DROP CONSTRAINT "flooring_template_service_item_templateId_fkey";

-- DropForeignKey
ALTER TABLE "flooring_template_service_item" DROP CONSTRAINT "flooring_template_service_item_unitId_fkey";

-- DropForeignKey
ALTER TABLE "flooring_work_order_sales_rep" DROP CONSTRAINT "flooring_work_order_sales_rep_contactId_fkey";

-- DropForeignKey
ALTER TABLE "flooring_work_order_sales_rep" DROP CONSTRAINT "flooring_work_order_sales_rep_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "flooring_work_order_service_item" DROP CONSTRAINT "flooring_work_order_service_item_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "flooring_work_order_service_item" DROP CONSTRAINT "flooring_work_order_service_item_unitId_fkey";

-- DropForeignKey
ALTER TABLE "flooring_work_order_service_item" DROP CONSTRAINT "flooring_work_order_service_item_workOrderId_fkey";

-- DropIndex
DROP INDEX "flooring_inventory_locationId_itemNumber_key";

-- DropIndex
DROP INDEX "flooring_template_templateTag_idx";

-- DropIndex
DROP INDEX "flooring_work_order_propertyId_status_idx";

-- DropIndex
DROP INDEX "flooring_work_order_status_scheduledFor_idx";

-- AlterTable
ALTER TABLE "flooring_template" DROP COLUMN "padProductId",
DROP COLUMN "store",
DROP COLUMN "templateTag",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "jobTypeId" TEXT,
ADD COLUMN     "managementCompanyId" TEXT,
ADD COLUMN     "propertyInstructions" TEXT,
ADD COLUMN     "unitType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "flooring_work_order" DROP COLUMN "googleDocUrl",
DROP COLUMN "googleDriveSlip",
DROP COLUMN "status",
DROP COLUMN "unitLabel",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "jobTypeId" TEXT,
ADD COLUMN     "managementCompanyId" TEXT,
ADD COLUMN     "propertyInstructions" TEXT,
ADD COLUMN     "unitNumber" TEXT;

-- AlterTable
ALTER TABLE "property_hub" ADD COLUMN     "instructions" TEXT;

-- DropTable
DROP TABLE "flooring_template_sales_rep";

-- DropTable
DROP TABLE "flooring_template_service_item";

-- DropTable
DROP TABLE "flooring_work_order_sales_rep";

-- DropTable
DROP TABLE "flooring_work_order_service_item";

-- DropEnum
DROP TYPE "FlooringStoreCode";

-- DropEnum
DROP TYPE "FlooringWorkOrderStatus";

-- CreateTable
CREATE TABLE "flooring_job_type" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_job_type_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flooring_job_type_name_key" ON "flooring_job_type"("name");

-- CreateIndex
CREATE INDEX "flooring_job_type_name_idx" ON "flooring_job_type"("name");

-- CreateIndex
CREATE INDEX "flooring_template_managementCompanyId_idx" ON "flooring_template"("managementCompanyId");

-- CreateIndex
CREATE INDEX "flooring_template_jobTypeId_idx" ON "flooring_template"("jobTypeId");

-- CreateIndex
CREATE INDEX "flooring_template_unitType_idx" ON "flooring_template"("unitType");

-- CreateIndex
CREATE INDEX "flooring_work_order_propertyId_idx" ON "flooring_work_order"("propertyId");

-- CreateIndex
CREATE INDEX "flooring_work_order_managementCompanyId_idx" ON "flooring_work_order"("managementCompanyId");

-- CreateIndex
CREATE INDEX "flooring_work_order_jobTypeId_idx" ON "flooring_work_order"("jobTypeId");

-- AddForeignKey
ALTER TABLE "flooring_template" ADD CONSTRAINT "flooring_template_managementCompanyId_fkey" FOREIGN KEY ("managementCompanyId") REFERENCES "flooring_management_company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template" ADD CONSTRAINT "flooring_template_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "flooring_job_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order" ADD CONSTRAINT "flooring_work_order_managementCompanyId_fkey" FOREIGN KEY ("managementCompanyId") REFERENCES "flooring_management_company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order" ADD CONSTRAINT "flooring_work_order_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "flooring_job_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

