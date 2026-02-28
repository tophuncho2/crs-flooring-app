-- CreateEnum
CREATE TYPE "FlooringWorkOrderStatus" AS ENUM ('BUILDING_ORDER', 'PENDING', 'CARPET_CLEANING', 'PULL_TEMPLATE', 'MODIFY', 'SENT_OUT');

-- CreateEnum
CREATE TYPE "FlooringVacancyStatus" AS ENUM ('VACANT', 'OCCUPIED');

-- CreateEnum
CREATE TYPE "FlooringChangeOrderStatus" AS ENUM ('SHORTAGE', 'SUFFICIENT');

-- CreateEnum
CREATE TYPE "FlooringStoreCode" AS ENUM ('DARBY', 'COLUMBIA');

-- CreateEnum
CREATE TYPE "FlooringImportStatus" AS ENUM ('PENDING_DELIVERY', 'FINAL');

-- CreateEnum
CREATE TYPE "FlooringTransportType" AS ENUM ('PURCHASE_ORDER', 'RETURN', 'WAREHOUSE_TRANSFER');

-- CreateEnum
CREATE TYPE "ConstructionJobStatus" AS ENUM ('FLAGGED', 'PENDING_JOB', 'ACTIVE_CONTRACTS', 'AWAITING_PAYMENT', 'PENDING_INVOICED', 'OVERHEAD_2026', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ConstructionJobType" AS ENUM ('CONSTRUCTION', 'OVERHEAD_COST');

-- CreateEnum
CREATE TYPE "ConstructionScopeType" AS ENUM ('MATERIAL', 'LABOR', 'DEPOSIT', 'RENTAL', 'PLANNING', 'FINAL_DEPOSIT');

-- CreateEnum
CREATE TYPE "ConstructionPendingPaymentStatus" AS ENUM ('PENDING_PAYMENT', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ConstructionDepositType" AS ENUM ('FIRST_DEPOSIT', 'SECOND_DEPOSIT', 'THIRD_DEPOSIT', 'FINAL_PAY');

-- CreateEnum
CREATE TYPE "ConstructionReceiptApprovalStatus" AS ENUM ('APPROVED', 'DENIED', 'PENDING', 'CONFIRM_PRICE', 'FLAG');

-- CreateEnum
CREATE TYPE "ConstructionVendorType" AS ENUM ('CRS', 'LABOR_VENDOR', 'MATERIAL_VENDOR', 'JOB_VENDOR', 'RENTAL_VENDOR', 'PLATFORM');

-- CreateTable
CREATE TABLE "property_hub" (
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

    CONSTRAINT "property_hub_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "flooring_property_management" (
    "propertyId" TEXT NOT NULL,
    "managementCompanyId" TEXT NOT NULL,

    CONSTRAINT "flooring_property_management_pkey" PRIMARY KEY ("propertyId","managementCompanyId")
);

-- CreateTable
CREATE TABLE "flooring_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryCode" INTEGER,
    "sendUnit" TEXT,
    "stockUnit" TEXT,
    "coverageAvailableUnit" TEXT,
    "itemCoverageUnit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_product" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "manufacturer" TEXT,
    "style" TEXT,
    "color" TEXT,
    "width" TEXT,
    "sheetSize" TEXT,
    "thickness" TEXT,
    "unitWeight" TEXT,
    "baseColor" TEXT,
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
CREATE TABLE "flooring_template" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "templateTag" TEXT NOT NULL,
    "store" "FlooringStoreCode",
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
    "notes" TEXT,
    "storedDyeLot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_template_item_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "flooring_location" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "section" TEXT,
    "locationCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_import_batch" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT,
    "importNumber" INTEGER,
    "importTag" TEXT,
    "transportType" "FlooringTransportType",
    "status" "FlooringImportStatus",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_import_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_work_order" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "templateId" TEXT,
    "warehouseId" TEXT,
    "status" "FlooringWorkOrderStatus" NOT NULL,
    "vacancy" "FlooringVacancyStatus",
    "scheduledFor" DATE,
    "unitLabel" TEXT,
    "customAddress" TEXT,
    "instructions" TEXT,
    "templateNotes" TEXT,
    "googleDriveSlip" TEXT,
    "googleDocUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_work_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_work_order_item" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "changeOrderStatus" "FlooringChangeOrderStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_work_order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_inventory_lot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "locationId" TEXT,
    "importBatchId" TEXT,
    "itemNumber" TEXT,
    "dyeLot" TEXT,
    "stockCount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "stockUnit" TEXT,
    "coveragePerUnit" DECIMAL(14,4),
    "coverageAvail" DECIMAL(14,4),
    "cost" DECIMAL(10,2),
    "freight" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_inventory_lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_inventory_reservation" (
    "id" TEXT NOT NULL,
    "workOrderItemId" TEXT NOT NULL,
    "inventoryLotId" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_inventory_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flooring_inventory_log" (
    "id" TEXT NOT NULL,
    "inventoryLotId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "cutAmount" DECIMAL(12,4),
    "beforeAmount" DECIMAL(12,4),
    "afterAmount" DECIMAL(12,4),
    "wasteReason" TEXT,
    "wasteAmount" DECIMAL(12,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_inventory_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_vendor" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "vendorType" "ConstructionVendorType",
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "construction_vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_vendor_property" (
    "vendorId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "construction_vendor_property_pkey" PRIMARY KEY ("vendorId","propertyId")
);

-- CreateTable
CREATE TABLE "construction_job" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT,
    "jobTag" TEXT,
    "status" "ConstructionJobStatus" NOT NULL,
    "jobType" "ConstructionJobType" NOT NULL DEFAULT 'CONSTRUCTION',
    "startingBudget" DECIMAL(14,2),
    "revenue" DECIMAL(14,2),
    "runningBudget" DECIMAL(14,2),
    "expenseTotal" DECIMAL(14,2),
    "pendingExpenses" DECIMAL(14,2),
    "budgetRemaining" DECIMAL(14,2),
    "anticipatedProfit" DECIMAL(14,2),
    "anticipatedMargin" DECIMAL(8,4),
    "currentProfit" DECIMAL(14,2),
    "currentMargin" DECIMAL(8,4),
    "finalProfit" DECIMAL(14,2),
    "finalMargin" DECIMAL(8,4),
    "onSiteContact" TEXT,
    "onSitePhone" TEXT,
    "billingInfo" TEXT,
    "docusketchUrl" TEXT,
    "fullJobFileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "construction_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_job_vendor" (
    "jobId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,

    CONSTRAINT "construction_job_vendor_pkey" PRIMARY KEY ("jobId","vendorId")
);

-- CreateTable
CREATE TABLE "construction_job_scope" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "vendorId" TEXT,
    "scopeName" TEXT,
    "scopeType" "ConstructionScopeType",
    "vacancy" BOOLEAN,
    "statusComplete" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "startDate" DATE,
    "endDate" DATE,
    "price" DECIMAL(14,2),
    "unitCount" DECIMAL(12,2),
    "estimatedRehabBudget" DECIMAL(14,2),
    "contractedCost" DECIMAL(14,2),
    "estimatedDurationDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "construction_job_scope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_scope_dependency" (
    "scopeId" TEXT NOT NULL,
    "dependsOnScopeId" TEXT NOT NULL,

    CONSTRAINT "construction_scope_dependency_pkey" PRIMARY KEY ("scopeId","dependsOnScopeId")
);

-- CreateTable
CREATE TABLE "construction_subcontract_agreement" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" TEXT,
    "agreementDate" DATE,
    "fullBudget" DECIMAL(14,2),
    "printSignature" TEXT,
    "agreementUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "construction_subcontract_agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_pending_payment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "agreementId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "ConstructionPendingPaymentStatus" NOT NULL,
    "depositType" "ConstructionDepositType",
    "completionRequiredPct" DECIMAL(6,4),
    "notes" TEXT,
    "requestedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "construction_pending_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_labor_payment_request" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "agreementId" TEXT,
    "fileStage" TEXT,
    "status" TEXT,
    "amount" DECIMAL(14,2),
    "notes" TEXT,
    "requestedOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "construction_labor_payment_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_receipt" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "vendorId" TEXT,
    "approval" "ConstructionReceiptApprovalStatus",
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "totalCost" DECIMAL(14,2),
    "store" TEXT,
    "receiptNumber" TEXT,
    "poOrJobName" TEXT,
    "purchaseDate" DATE,
    "paymentMethod" TEXT,
    "storeAddress" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "construction_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_expense" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "vendorId" TEXT,
    "receiptId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "expenseType" TEXT,
    "paymentType" TEXT,
    "paymentDate" DATE,
    "receiptNumber" TEXT,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "construction_expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_accounts_receivable" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "drawAmount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "construction_accounts_receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_budget_increase" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" TEXT,
    "notes" TEXT,
    "jobNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "construction_budget_increase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_checklist_item" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "checklistItem" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "construction_checklist_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "property_hub_name_idx" ON "property_hub"("name");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_management_company_name_key" ON "flooring_management_company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_category_name_key" ON "flooring_category"("name");

-- CreateIndex
CREATE INDEX "flooring_template_propertyId_idx" ON "flooring_template"("propertyId");

-- CreateIndex
CREATE INDEX "flooring_template_templateTag_idx" ON "flooring_template"("templateTag");

-- CreateIndex
CREATE INDEX "flooring_template_item_templateId_idx" ON "flooring_template_item"("templateId");

-- CreateIndex
CREATE INDEX "flooring_template_item_productId_idx" ON "flooring_template_item"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_warehouse_name_key" ON "flooring_warehouse"("name");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_location_warehouseId_locationCode_key" ON "flooring_location"("warehouseId", "locationCode");

-- CreateIndex
CREATE INDEX "flooring_import_batch_warehouseId_idx" ON "flooring_import_batch"("warehouseId");

-- CreateIndex
CREATE INDEX "flooring_work_order_propertyId_status_idx" ON "flooring_work_order"("propertyId", "status");

-- CreateIndex
CREATE INDEX "flooring_work_order_scheduledFor_idx" ON "flooring_work_order"("scheduledFor");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_workOrderId_idx" ON "flooring_work_order_item"("workOrderId");

-- CreateIndex
CREATE INDEX "flooring_work_order_item_productId_idx" ON "flooring_work_order_item"("productId");

-- CreateIndex
CREATE INDEX "flooring_inventory_lot_productId_idx" ON "flooring_inventory_lot"("productId");

-- CreateIndex
CREATE INDEX "flooring_inventory_lot_warehouseId_idx" ON "flooring_inventory_lot"("warehouseId");

-- CreateIndex
CREATE INDEX "flooring_inventory_reservation_workOrderItemId_idx" ON "flooring_inventory_reservation"("workOrderItemId");

-- CreateIndex
CREATE INDEX "flooring_inventory_reservation_inventoryLotId_idx" ON "flooring_inventory_reservation"("inventoryLotId");

-- CreateIndex
CREATE INDEX "flooring_inventory_log_inventoryLotId_idx" ON "flooring_inventory_log"("inventoryLotId");

-- CreateIndex
CREATE INDEX "flooring_inventory_log_workOrderId_idx" ON "flooring_inventory_log"("workOrderId");

-- CreateIndex
CREATE INDEX "construction_vendor_companyName_idx" ON "construction_vendor"("companyName");

-- CreateIndex
CREATE INDEX "construction_job_status_jobType_idx" ON "construction_job"("status", "jobType");

-- CreateIndex
CREATE INDEX "construction_job_propertyId_idx" ON "construction_job"("propertyId");

-- CreateIndex
CREATE INDEX "construction_job_scope_jobId_idx" ON "construction_job_scope"("jobId");

-- CreateIndex
CREATE INDEX "construction_job_scope_vendorId_idx" ON "construction_job_scope"("vendorId");

-- CreateIndex
CREATE INDEX "construction_subcontract_agreement_jobId_vendorId_idx" ON "construction_subcontract_agreement"("jobId", "vendorId");

-- CreateIndex
CREATE INDEX "construction_pending_payment_jobId_status_idx" ON "construction_pending_payment"("jobId", "status");

-- CreateIndex
CREATE INDEX "construction_pending_payment_vendorId_idx" ON "construction_pending_payment"("vendorId");

-- CreateIndex
CREATE INDEX "construction_labor_payment_request_jobId_idx" ON "construction_labor_payment_request"("jobId");

-- CreateIndex
CREATE INDEX "construction_labor_payment_request_vendorId_idx" ON "construction_labor_payment_request"("vendorId");

-- CreateIndex
CREATE INDEX "construction_receipt_jobId_idx" ON "construction_receipt"("jobId");

-- CreateIndex
CREATE INDEX "construction_expense_jobId_idx" ON "construction_expense"("jobId");

-- CreateIndex
CREATE INDEX "construction_expense_vendorId_idx" ON "construction_expense"("vendorId");

-- CreateIndex
CREATE INDEX "construction_expense_receiptId_idx" ON "construction_expense"("receiptId");

-- CreateIndex
CREATE INDEX "construction_accounts_receivable_jobId_idx" ON "construction_accounts_receivable"("jobId");

-- CreateIndex
CREATE INDEX "construction_budget_increase_jobId_idx" ON "construction_budget_increase"("jobId");

-- CreateIndex
CREATE INDEX "construction_checklist_item_jobId_idx" ON "construction_checklist_item"("jobId");

-- AddForeignKey
ALTER TABLE "flooring_property_management" ADD CONSTRAINT "flooring_property_management_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property_hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_property_management" ADD CONSTRAINT "flooring_property_management_managementCompanyId_fkey" FOREIGN KEY ("managementCompanyId") REFERENCES "flooring_management_company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_product" ADD CONSTRAINT "flooring_product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "flooring_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template" ADD CONSTRAINT "flooring_template_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property_hub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template" ADD CONSTRAINT "flooring_template_padProductId_fkey" FOREIGN KEY ("padProductId") REFERENCES "flooring_product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template_item" ADD CONSTRAINT "flooring_template_item_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "flooring_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template_item" ADD CONSTRAINT "flooring_template_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "flooring_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_location" ADD CONSTRAINT "flooring_location_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_import_batch" ADD CONSTRAINT "flooring_import_batch_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "flooring_inventory_lot" ADD CONSTRAINT "flooring_inventory_lot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "flooring_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_inventory_lot" ADD CONSTRAINT "flooring_inventory_lot_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_inventory_lot" ADD CONSTRAINT "flooring_inventory_lot_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "flooring_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_inventory_lot" ADD CONSTRAINT "flooring_inventory_lot_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "flooring_import_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_inventory_reservation" ADD CONSTRAINT "flooring_inventory_reservation_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES "flooring_work_order_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_inventory_reservation" ADD CONSTRAINT "flooring_inventory_reservation_inventoryLotId_fkey" FOREIGN KEY ("inventoryLotId") REFERENCES "flooring_inventory_lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_inventory_log" ADD CONSTRAINT "flooring_inventory_log_inventoryLotId_fkey" FOREIGN KEY ("inventoryLotId") REFERENCES "flooring_inventory_lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_inventory_log" ADD CONSTRAINT "flooring_inventory_log_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_vendor_property" ADD CONSTRAINT "construction_vendor_property_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "construction_vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_vendor_property" ADD CONSTRAINT "construction_vendor_property_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property_hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_job" ADD CONSTRAINT "construction_job_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property_hub"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_job_vendor" ADD CONSTRAINT "construction_job_vendor_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "construction_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_job_vendor" ADD CONSTRAINT "construction_job_vendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "construction_vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_job_scope" ADD CONSTRAINT "construction_job_scope_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "construction_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_job_scope" ADD CONSTRAINT "construction_job_scope_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "construction_vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_scope_dependency" ADD CONSTRAINT "construction_scope_dependency_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "construction_job_scope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_scope_dependency" ADD CONSTRAINT "construction_scope_dependency_dependsOnScopeId_fkey" FOREIGN KEY ("dependsOnScopeId") REFERENCES "construction_job_scope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_subcontract_agreement" ADD CONSTRAINT "construction_subcontract_agreement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "construction_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_subcontract_agreement" ADD CONSTRAINT "construction_subcontract_agreement_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "construction_vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_pending_payment" ADD CONSTRAINT "construction_pending_payment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "construction_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_pending_payment" ADD CONSTRAINT "construction_pending_payment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "construction_vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_pending_payment" ADD CONSTRAINT "construction_pending_payment_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "construction_subcontract_agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_labor_payment_request" ADD CONSTRAINT "construction_labor_payment_request_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "construction_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_labor_payment_request" ADD CONSTRAINT "construction_labor_payment_request_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "construction_vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_labor_payment_request" ADD CONSTRAINT "construction_labor_payment_request_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "construction_subcontract_agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_receipt" ADD CONSTRAINT "construction_receipt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "construction_job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_receipt" ADD CONSTRAINT "construction_receipt_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "construction_vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_expense" ADD CONSTRAINT "construction_expense_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "construction_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_expense" ADD CONSTRAINT "construction_expense_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "construction_vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_expense" ADD CONSTRAINT "construction_expense_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "construction_receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_accounts_receivable" ADD CONSTRAINT "construction_accounts_receivable_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "construction_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_budget_increase" ADD CONSTRAINT "construction_budget_increase_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "construction_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_checklist_item" ADD CONSTRAINT "construction_checklist_item_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "construction_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

