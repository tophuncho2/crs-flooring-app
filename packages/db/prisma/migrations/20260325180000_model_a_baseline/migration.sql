-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CONTRACTOR', 'CUSTOMER', 'OWNER', 'ADMIN', 'BUILDER');

-- CreateEnum
CREATE TYPE "FlooringWorkOrderStatus" AS ENUM ('BUILDING_ORDER', 'PENDING_EXPORT', 'CARPET_CLEANING', 'SENT_OUT', 'PENDING', 'PULL_TEMPLATE', 'MODIFY');

-- CreateEnum
CREATE TYPE "FlooringVacancyStatus" AS ENUM ('VACANT', 'OCCUPIED');

-- CreateEnum
CREATE TYPE "FlooringChangeOrderStatus" AS ENUM ('SHORTAGE', 'SUFFICIENT');

-- CreateEnum
CREATE TYPE "FlooringStoreCode" AS ENUM ('DARBY', 'COLUMBIA');

-- CreateEnum
CREATE TYPE "FlooringContactType" AS ENUM ('SALES_REP', 'CONTRACTOR', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "hiddenFlooringNavSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "flooringNavOrderSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTablePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tableKey" TEXT NOT NULL,
    "hiddenColumnKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "columnOrderKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isAscendingSort" BOOLEAN NOT NULL DEFAULT true,
    "isGroupingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "groupByKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "filtersJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTablePreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLoginActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT NOT NULL,
    "loggedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLoginActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_management_company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "streetAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_management_company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_hub" (
    "id" TEXT NOT NULL,
    "managementCompanyId" TEXT,
    "name" TEXT NOT NULL,
    "streetAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_hub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryCode" INTEGER,
    "sendUnitId" TEXT,
    "stockUnitId" TEXT,
    "coverageAvailableUnitId" TEXT,
    "itemCoverageUnitId" TEXT,
    "serviceUnitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_unit_of_measure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_unit_of_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_manufacturer" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "agentName" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_manufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "categoryId" TEXT NOT NULL,
    "manufacturer" TEXT,
    "manufacturerId" TEXT,
    "style" TEXT,
    "color" TEXT,
    "width" TEXT,
    "sheetSize" TEXT,
    "thickness" TEXT,
    "unitWeight" TEXT,
    "baseColor" TEXT,
    "coveragePerUnit" DECIMAL(12,4),
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cost" DECIMAL(10,2),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "subOrder" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseCost" DECIMAL(10,2) NOT NULL,
    "unitId" TEXT NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FlooringContactType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_inventory" (
    "id" TEXT NOT NULL,
    "importEntryId" TEXT,
    "productId" TEXT NOT NULL,
    "itemNumber" TEXT NOT NULL,
    "dyeLot" TEXT,
    "locationId" TEXT,
    "stockCount" DECIMAL(12,2) NOT NULL,
    "cost" DECIMAL(10,2),
    "freight" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_import_entry" (
    "id" TEXT NOT NULL,
    "importNumber" SERIAL NOT NULL,
    "orderNumber" TEXT,
    "tag" TEXT,
    "transportType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "warehouseId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_import_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_cut_log" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "workOrderItemId" TEXT,
    "before" DECIMAL(12,2) NOT NULL,
    "cut" DECIMAL(12,2) NOT NULL,
    "after" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_cut_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_template" (
    "id" TEXT NOT NULL,
    "template_number" TEXT NOT NULL DEFAULT ('TP-'::text || lpad((nextval('flooring_template_number_seq'::regclass))::text, 5, '0'::text)),
    "propertyId" TEXT NOT NULL,
    "templateTag" TEXT NOT NULL,
    "store" "FlooringStoreCode",
    "warehouseId" TEXT,
    "instructions" TEXT,
    "templateNotes" TEXT,
    "padProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_template_item" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_template_item_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "flooring_template_sales_rep" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_template_sales_rep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_section" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_location" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_work_order" (
    "id" TEXT NOT NULL,
    "work_order_number" TEXT NOT NULL DEFAULT ('WO-'::text || lpad((nextval('flooring_work_order_number_seq'::regclass))::text, 5, '0'::text)),
    "propertyId" TEXT NOT NULL,
    "templateId" TEXT,
    "warehouseId" TEXT,
    "status" "FlooringWorkOrderStatus" NOT NULL,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "vacancy" "FlooringVacancyStatus",
    "scheduledFor" DATE,
    "unitLabel" TEXT,
    "unitType" TEXT,
    "customAddress" TEXT,
    "instructions" TEXT,
    "notes" TEXT,
    "googleDriveSlip" TEXT,
    "googleDocUrl" TEXT,
    "templateSyncedAt" TIMESTAMP(3),
    "templateSyncMode" TEXT,
    "templateSnapshotHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_work_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_work_order_item" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sourceTemplateItemId" TEXT,
    "linkedInventoryId" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "changeOrderStatus" "FlooringChangeOrderStatus" DEFAULT 'SUFFICIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_work_order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_work_order_service_item" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "sourceTemplateServiceItemId" TEXT,
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
CREATE TABLE "flooring_work_order_sales_rep" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_work_order_sales_rep_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserTablePreference_userId_idx" ON "UserTablePreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTablePreference_userId_tableKey_key" ON "UserTablePreference"("userId", "tableKey");

-- CreateIndex
CREATE INDEX "UserLoginActivity_loggedInAt_idx" ON "UserLoginActivity"("loggedInAt");

-- CreateIndex
CREATE INDEX "UserLoginActivity_userEmail_idx" ON "UserLoginActivity"("userEmail");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_management_company_name_key" ON "flooring_management_company"("name");

-- CreateIndex
CREATE INDEX "property_hub_managementCompanyId_idx" ON "property_hub"("managementCompanyId");

-- CreateIndex
CREATE INDEX "property_hub_name_idx" ON "property_hub"("name");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_category_name_key" ON "flooring_category"("name");

-- CreateIndex
CREATE INDEX "flooring_category_sendUnitId_idx" ON "flooring_category"("sendUnitId");

-- CreateIndex
CREATE INDEX "flooring_category_stockUnitId_idx" ON "flooring_category"("stockUnitId");

-- CreateIndex
CREATE INDEX "flooring_category_coverageAvailableUnitId_idx" ON "flooring_category"("coverageAvailableUnitId");

-- CreateIndex
CREATE INDEX "flooring_category_itemCoverageUnitId_idx" ON "flooring_category"("itemCoverageUnitId");

-- CreateIndex
CREATE INDEX "flooring_category_serviceUnitId_idx" ON "flooring_category"("serviceUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_unit_of_measure_name_key" ON "flooring_unit_of_measure"("name");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_manufacturer_companyName_key" ON "flooring_manufacturer"("companyName");

-- CreateIndex
CREATE INDEX "flooring_product_manufacturerId_idx" ON "flooring_product"("manufacturerId");

-- CreateIndex
CREATE INDEX "flooring_product_name_idx" ON "flooring_product"("name");

-- CreateIndex
CREATE INDEX "flooring_service_name_idx" ON "flooring_service"("name");

-- CreateIndex
CREATE INDEX "flooring_service_unitId_idx" ON "flooring_service"("unitId");

-- CreateIndex
CREATE INDEX "flooring_contact_name_idx" ON "flooring_contact"("name");

-- CreateIndex
CREATE INDEX "flooring_contact_type_idx" ON "flooring_contact"("type");

-- CreateIndex
CREATE INDEX "flooring_inventory_importEntryId_idx" ON "flooring_inventory"("importEntryId");

-- CreateIndex
CREATE INDEX "flooring_inventory_productId_idx" ON "flooring_inventory"("productId");

-- CreateIndex
CREATE INDEX "flooring_inventory_locationId_idx" ON "flooring_inventory"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_inventory_locationId_itemNumber_key" ON "flooring_inventory"("locationId", "itemNumber");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_import_entry_importNumber_key" ON "flooring_import_entry"("importNumber");

-- CreateIndex
CREATE INDEX "flooring_import_entry_createdAt_idx" ON "flooring_import_entry"("createdAt");

-- CreateIndex
CREATE INDEX "flooring_import_entry_warehouseId_idx" ON "flooring_import_entry"("warehouseId");

-- CreateIndex
CREATE INDEX "flooring_cut_log_inventoryId_idx" ON "flooring_cut_log"("inventoryId");

-- CreateIndex
CREATE INDEX "flooring_cut_log_workOrderId_idx" ON "flooring_cut_log"("workOrderId");

-- CreateIndex
CREATE INDEX "flooring_cut_log_workOrderItemId_idx" ON "flooring_cut_log"("workOrderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_template_template_number_key" ON "flooring_template"("template_number");

-- CreateIndex
CREATE INDEX "flooring_template_template_number_idx" ON "flooring_template"("template_number");

-- CreateIndex
CREATE INDEX "flooring_template_propertyId_idx" ON "flooring_template"("propertyId");

-- CreateIndex
CREATE INDEX "flooring_template_warehouseId_idx" ON "flooring_template"("warehouseId");

-- CreateIndex
CREATE INDEX "flooring_template_templateTag_idx" ON "flooring_template"("templateTag");

-- CreateIndex
CREATE INDEX "flooring_template_createdAt_idx" ON "flooring_template"("createdAt");

-- CreateIndex
CREATE INDEX "flooring_template_updatedAt_idx" ON "flooring_template"("updatedAt");

-- CreateIndex
CREATE INDEX "flooring_template_item_templateId_idx" ON "flooring_template_item"("templateId");

-- CreateIndex
CREATE INDEX "flooring_template_item_templateId_createdAt_idx" ON "flooring_template_item"("templateId", "createdAt");

-- CreateIndex
CREATE INDEX "flooring_template_item_productId_idx" ON "flooring_template_item"("productId");

-- CreateIndex
CREATE INDEX "flooring_template_service_item_templateId_idx" ON "flooring_template_service_item"("templateId");

-- CreateIndex
CREATE INDEX "flooring_template_service_item_templateId_createdAt_idx" ON "flooring_template_service_item"("templateId", "createdAt");

-- CreateIndex
CREATE INDEX "flooring_template_service_item_serviceId_idx" ON "flooring_template_service_item"("serviceId");

-- CreateIndex
CREATE INDEX "flooring_template_service_item_unitId_idx" ON "flooring_template_service_item"("unitId");

-- CreateIndex
CREATE INDEX "flooring_template_sales_rep_templateId_idx" ON "flooring_template_sales_rep"("templateId");

-- CreateIndex
CREATE INDEX "flooring_template_sales_rep_contactId_idx" ON "flooring_template_sales_rep"("contactId");

-- CreateIndex
CREATE INDEX "flooring_template_sales_rep_templateId_createdAt_idx" ON "flooring_template_sales_rep"("templateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_template_sales_rep_templateId_contactId_key" ON "flooring_template_sales_rep"("templateId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_warehouse_name_key" ON "flooring_warehouse"("name");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_section_warehouseId_name_key" ON "flooring_section"("warehouseId", "name");

-- CreateIndex
CREATE INDEX "flooring_location_sectionId_idx" ON "flooring_location"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_location_warehouseId_locationCode_key" ON "flooring_location"("warehouseId", "locationCode");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_work_order_work_order_number_key" ON "flooring_work_order"("work_order_number");

-- CreateIndex
CREATE INDEX "flooring_work_order_work_order_number_idx" ON "flooring_work_order"("work_order_number");

-- CreateIndex
CREATE INDEX "flooring_work_order_is_complete_idx" ON "flooring_work_order"("is_complete");

-- CreateIndex
CREATE INDEX "flooring_work_order_propertyId_status_idx" ON "flooring_work_order"("propertyId", "status");

-- CreateIndex
CREATE INDEX "flooring_work_order_status_scheduledFor_idx" ON "flooring_work_order"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "flooring_work_order_scheduledFor_idx" ON "flooring_work_order"("scheduledFor");

-- CreateIndex
CREATE INDEX "flooring_work_order_createdAt_idx" ON "flooring_work_order"("createdAt");

-- CreateIndex
CREATE INDEX "flooring_work_order_updatedAt_idx" ON "flooring_work_order"("updatedAt");

-- CreateIndex
CREATE INDEX "flooring_work_order_templateId_idx" ON "flooring_work_order"("templateId");

-- CreateIndex
CREATE INDEX "flooring_work_order_warehouseId_idx" ON "flooring_work_order"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_work_order_item_linkedInventoryId_key" ON "flooring_work_order_item"("linkedInventoryId");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_workOrderId_idx" ON "flooring_work_order_item"("workOrderId");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_workOrderId_createdAt_idx" ON "flooring_work_order_item"("workOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_productId_idx" ON "flooring_work_order_item"("productId");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_linkedInventoryId_idx" ON "flooring_work_order_item"("linkedInventoryId");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_sourceTemplateItemId_idx" ON "flooring_work_order_item"("sourceTemplateItemId");

-- CreateIndex
CREATE INDEX "flooring_work_order_service_item_workOrderId_idx" ON "flooring_work_order_service_item"("workOrderId");

-- CreateIndex
CREATE INDEX "flooring_work_order_service_item_workOrderId_createdAt_idx" ON "flooring_work_order_service_item"("workOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "flooring_work_order_service_item_serviceId_idx" ON "flooring_work_order_service_item"("serviceId");

-- CreateIndex
CREATE INDEX "flooring_work_order_service_item_unitId_idx" ON "flooring_work_order_service_item"("unitId");

-- CreateIndex
CREATE INDEX "flooring_work_order_service_item_sourceTemplateServiceItemI_idx" ON "flooring_work_order_service_item"("sourceTemplateServiceItemId");

-- CreateIndex
CREATE INDEX "flooring_work_order_sales_rep_workOrderId_idx" ON "flooring_work_order_sales_rep"("workOrderId");

-- CreateIndex
CREATE INDEX "flooring_work_order_sales_rep_contactId_idx" ON "flooring_work_order_sales_rep"("contactId");

-- CreateIndex
CREATE INDEX "flooring_work_order_sales_rep_workOrderId_createdAt_idx" ON "flooring_work_order_sales_rep"("workOrderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_work_order_sales_rep_workOrderId_contactId_key" ON "flooring_work_order_sales_rep"("workOrderId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_analytics_workOrderId_key" ON "flooring_analytics"("workOrderId");

-- CreateIndex
CREATE INDEX "flooring_analytics_workOrderId_idx" ON "flooring_analytics"("workOrderId");

-- AddForeignKey
ALTER TABLE "UserTablePreference" ADD CONSTRAINT "UserTablePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLoginActivity" ADD CONSTRAINT "UserLoginActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_hub" ADD CONSTRAINT "property_hub_managementCompanyId_fkey" FOREIGN KEY ("managementCompanyId") REFERENCES "flooring_management_company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_category" ADD CONSTRAINT "flooring_category_sendUnitId_fkey" FOREIGN KEY ("sendUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_category" ADD CONSTRAINT "flooring_category_stockUnitId_fkey" FOREIGN KEY ("stockUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_category" ADD CONSTRAINT "flooring_category_coverageAvailableUnitId_fkey" FOREIGN KEY ("coverageAvailableUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_category" ADD CONSTRAINT "flooring_category_itemCoverageUnitId_fkey" FOREIGN KEY ("itemCoverageUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_category" ADD CONSTRAINT "flooring_category_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_product" ADD CONSTRAINT "flooring_product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "flooring_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_product" ADD CONSTRAINT "flooring_product_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "flooring_manufacturer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_service" ADD CONSTRAINT "flooring_service_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_inventory" ADD CONSTRAINT "flooring_inventory_importEntryId_fkey" FOREIGN KEY ("importEntryId") REFERENCES "flooring_import_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_inventory" ADD CONSTRAINT "flooring_inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "flooring_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_inventory" ADD CONSTRAINT "flooring_inventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "flooring_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_import_entry" ADD CONSTRAINT "flooring_import_entry_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_cut_log" ADD CONSTRAINT "flooring_cut_log_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "flooring_inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_cut_log" ADD CONSTRAINT "flooring_cut_log_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_cut_log" ADD CONSTRAINT "flooring_cut_log_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES "flooring_work_order_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template" ADD CONSTRAINT "flooring_template_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property_hub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template" ADD CONSTRAINT "flooring_template_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template" ADD CONSTRAINT "flooring_template_padProductId_fkey" FOREIGN KEY ("padProductId") REFERENCES "flooring_product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template_item" ADD CONSTRAINT "flooring_template_item_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "flooring_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template_item" ADD CONSTRAINT "flooring_template_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "flooring_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template_service_item" ADD CONSTRAINT "flooring_template_service_item_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "flooring_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template_service_item" ADD CONSTRAINT "flooring_template_service_item_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "flooring_service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template_service_item" ADD CONSTRAINT "flooring_template_service_item_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template_sales_rep" ADD CONSTRAINT "flooring_template_sales_rep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "flooring_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template_sales_rep" ADD CONSTRAINT "flooring_template_sales_rep_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "flooring_contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_section" ADD CONSTRAINT "flooring_section_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_location" ADD CONSTRAINT "flooring_location_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_location" ADD CONSTRAINT "flooring_location_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "flooring_section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order" ADD CONSTRAINT "flooring_work_order_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property_hub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order" ADD CONSTRAINT "flooring_work_order_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "flooring_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order" ADD CONSTRAINT "flooring_work_order_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_item" ADD CONSTRAINT "flooring_work_order_item_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_item" ADD CONSTRAINT "flooring_work_order_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "flooring_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_item" ADD CONSTRAINT "flooring_work_order_item_linkedInventoryId_fkey" FOREIGN KEY ("linkedInventoryId") REFERENCES "flooring_inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_service_item" ADD CONSTRAINT "flooring_work_order_service_item_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_service_item" ADD CONSTRAINT "flooring_work_order_service_item_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "flooring_service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_service_item" ADD CONSTRAINT "flooring_work_order_service_item_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_sales_rep" ADD CONSTRAINT "flooring_work_order_sales_rep_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_sales_rep" ADD CONSTRAINT "flooring_work_order_sales_rep_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "flooring_contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_analytics" ADD CONSTRAINT "flooring_analytics_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

