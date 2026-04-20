-- Sequences used by dbgenerated() defaults (template_number, work_order_number).
-- Prisma does not auto-emit CREATE SEQUENCE for dbgenerated nextval() defaults,
-- so they are declared here before any table that references them.
CREATE SEQUENCE IF NOT EXISTS "flooring_template_number_seq";
CREATE SEQUENCE IF NOT EXISTS "flooring_work_order_number_seq";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CONTRACTOR', 'CUSTOMER', 'OWNER', 'ADMIN', 'BUILDER');

-- CreateEnum
CREATE TYPE "FlooringWorkOrderStatus" AS ENUM ('BUILDING_ORDER', 'PENDING_EXPORT', 'CARPET_CLEANING', 'SENT_OUT', 'PENDING', 'PULL_TEMPLATE', 'MODIFY');

-- CreateEnum
CREATE TYPE "FlooringAllocationMethod" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "FlooringWorkOrderAllocationRunStatus" AS ENUM ('REQUESTED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "QueueOutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'DISPATCHED', 'EXHAUSTED');

-- CreateEnum
CREATE TYPE "FlooringVacancyStatus" AS ENUM ('VACANT', 'OCCUPIED');

-- CreateEnum
CREATE TYPE "FlooringChangeOrderStatus" AS ENUM ('SHORTAGE', 'SUFFICIENT');

-- CreateEnum
CREATE TYPE "FlooringWorkOrderItemAllocationStatus" AS ENUM ('NOT_STARTED', 'PARTIALLY_ALLOCATED', 'FULLY_ALLOCATED', 'SHORTAGE');

-- CreateEnum
CREATE TYPE "FlooringStoreCode" AS ENUM ('DARBY', 'COLUMBIA');

-- CreateEnum
CREATE TYPE "FlooringContactType" AS ENUM ('SALES_REP', 'CONTRACTOR', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
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
CREATE TABLE "app_mutation_receipt" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseStatus" INTEGER,
    "responseBodyJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_mutation_receipt_pkey" PRIMARY KEY ("id")
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
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sendUnitId" TEXT,
    "stockUnitId" TEXT,
    "coverageAvailableUnitId" TEXT,
    "itemCoverageUnitId" TEXT,
    "serviceUnitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_unit_of_measure" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_unit_of_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_manufacturer" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyNameNormalized" TEXT NOT NULL,
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
    "coveragePerUnit" DECIMAL(12,4),
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
    "reservedStockCount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cost" DECIMAL(10,2),
    "freight" DECIMAL(10,2),
    "notes" TEXT,
    "fifoReceivedAt" TIMESTAMP(3) NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "number" INTEGER NOT NULL,
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
    "number" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_location" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "rafter" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
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
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "changeOrderStatus" "FlooringChangeOrderStatus" DEFAULT 'SUFFICIENT',
    "allocationStatus" "FlooringWorkOrderItemAllocationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_work_order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_work_order_item_allocation" (
    "id" TEXT NOT NULL,
    "workOrderItemId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "cutSize" TEXT,
    "unitCost" DECIMAL(10,4) NOT NULL,
    "method" "FlooringAllocationMethod" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_work_order_item_allocation_pkey" PRIMARY KEY ("id")
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_work_order_service_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_work_order_sales_rep" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "sourceTemplateSalesRepId" TEXT,
    "contactId" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_work_order_sales_rep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_work_order_allocation_run" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "sourceVersion" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "FlooringWorkOrderAllocationRunStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestId" TEXT,
    "queueJobId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queuedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "allocatedRowCount" INTEGER NOT NULL DEFAULT 0,
    "shortageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_work_order_allocation_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_outbox_event" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "status" "QueueOutboxEventStatus" NOT NULL DEFAULT 'PENDING',
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queue_outbox_event_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "app_mutation_receipt_userId_idx" ON "app_mutation_receipt"("userId");

-- CreateIndex
CREATE INDEX "app_mutation_receipt_expiresAt_idx" ON "app_mutation_receipt"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "app_mutation_receipt_scope_userId_idempotencyKey_key" ON "app_mutation_receipt"("scope", "userId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_management_company_name_key" ON "flooring_management_company"("name");

-- CreateIndex
CREATE INDEX "property_hub_managementCompanyId_idx" ON "property_hub"("managementCompanyId");

-- CreateIndex
CREATE INDEX "property_hub_name_idx" ON "property_hub"("name");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_category_slug_key" ON "flooring_category"("slug");

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
CREATE UNIQUE INDEX "flooring_unit_of_measure_slug_key" ON "flooring_unit_of_measure"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_unit_of_measure_name_key" ON "flooring_unit_of_measure"("name");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_manufacturer_companyNameNormalized_key" ON "flooring_manufacturer"("companyNameNormalized");

-- CreateIndex
CREATE INDEX "flooring_manufacturer_companyName_idx" ON "flooring_manufacturer"("companyName");

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
CREATE INDEX "flooring_inventory_productId_fifoReceivedAt_itemNumber_id_idx" ON "flooring_inventory"("productId", "fifoReceivedAt", "itemNumber", "id");

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
CREATE UNIQUE INDEX "flooring_warehouse_number_key" ON "flooring_warehouse"("number");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_warehouse_name_key" ON "flooring_warehouse"("name");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_section_warehouseId_number_key" ON "flooring_section"("warehouseId", "number");

-- CreateIndex
CREATE INDEX "flooring_location_sectionId_idx" ON "flooring_location"("sectionId");

-- CreateIndex
CREATE INDEX "flooring_location_warehouseId_idx" ON "flooring_location"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_location_warehouseId_rafter_level_key" ON "flooring_location"("warehouseId", "rafter", "level");

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
CREATE INDEX "flooring_work_order_item_workOrderId_idx" ON "flooring_work_order_item"("workOrderId");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_workOrderId_allocationStatus_idx" ON "flooring_work_order_item"("workOrderId", "allocationStatus");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_workOrderId_createdAt_idx" ON "flooring_work_order_item"("workOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_productId_idx" ON "flooring_work_order_item"("productId");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_sourceTemplateItemId_idx" ON "flooring_work_order_item"("sourceTemplateItemId");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_allocation_workOrderItemId_idx" ON "flooring_work_order_item_allocation"("workOrderItemId");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_allocation_workOrderItemId_created_idx" ON "flooring_work_order_item_allocation"("workOrderItemId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_allocation_inventoryId_idx" ON "flooring_work_order_item_allocation"("inventoryId");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_allocation_inventoryId_method_idx" ON "flooring_work_order_item_allocation"("inventoryId", "method");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_allocation_method_idx" ON "flooring_work_order_item_allocation"("method");

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
CREATE INDEX "flooring_work_order_sales_rep_sourceTemplateSalesRepId_idx" ON "flooring_work_order_sales_rep"("sourceTemplateSalesRepId");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_work_order_sales_rep_workOrderId_contactId_key" ON "flooring_work_order_sales_rep"("workOrderId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_work_order_allocation_run_idempotencyKey_key" ON "flooring_work_order_allocation_run"("idempotencyKey");

-- CreateIndex
CREATE INDEX "flooring_work_order_allocation_run_workOrderId_requestedAt_idx" ON "flooring_work_order_allocation_run"("workOrderId", "requestedAt");

-- CreateIndex
CREATE INDEX "flooring_work_order_allocation_run_status_requestedAt_idx" ON "flooring_work_order_allocation_run"("status", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_work_order_allocation_run_workOrderId_sourceVersio_key" ON "flooring_work_order_allocation_run"("workOrderId", "sourceVersion");

-- CreateIndex
CREATE UNIQUE INDEX "queue_outbox_event_idempotencyKey_key" ON "queue_outbox_event"("idempotencyKey");

-- CreateIndex
CREATE INDEX "queue_outbox_event_status_availableAt_idx" ON "queue_outbox_event"("status", "availableAt");

-- CreateIndex
CREATE INDEX "queue_outbox_event_status_availableAt_lockedAt_createdAt_idx" ON "queue_outbox_event"("status", "availableAt", "lockedAt", "createdAt");

-- CreateIndex
CREATE INDEX "queue_outbox_event_topic_status_availableAt_lockedAt_create_idx" ON "queue_outbox_event"("topic", "status", "availableAt", "lockedAt", "createdAt");

-- CreateIndex
CREATE INDEX "queue_outbox_event_aggregateType_aggregateId_idx" ON "queue_outbox_event"("aggregateType", "aggregateId");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_analytics_workOrderId_key" ON "flooring_analytics"("workOrderId");

-- CreateIndex
CREATE INDEX "flooring_analytics_workOrderId_idx" ON "flooring_analytics"("workOrderId");

-- AddForeignKey
ALTER TABLE "UserTablePreference" ADD CONSTRAINT "UserTablePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLoginActivity" ADD CONSTRAINT "UserLoginActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_mutation_receipt" ADD CONSTRAINT "app_mutation_receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "flooring_section" ADD CONSTRAINT "flooring_section_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_location" ADD CONSTRAINT "flooring_location_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "flooring_work_order_item_allocation" ADD CONSTRAINT "flooring_work_order_item_allocation_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES "flooring_work_order_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_item_allocation" ADD CONSTRAINT "flooring_work_order_item_allocation_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "flooring_inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "flooring_work_order_allocation_run" ADD CONSTRAINT "flooring_work_order_allocation_run_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_allocation_run" ADD CONSTRAINT "flooring_work_order_allocation_run_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_analytics" ADD CONSTRAINT "flooring_analytics_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

