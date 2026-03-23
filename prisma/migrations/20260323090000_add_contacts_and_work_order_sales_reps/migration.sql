CREATE TYPE "FlooringContactType" AS ENUM ('SALES_REP', 'CONTRACTOR', 'OTHER');

CREATE TABLE "flooring_contact" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "FlooringContactType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "flooring_contact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "flooring_work_order_sales_rep" (
  "id" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "percent" DECIMAL(5,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "flooring_work_order_sales_rep_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "flooring_contact_name_idx"
ON "flooring_contact"("name");

CREATE INDEX "flooring_contact_type_idx"
ON "flooring_contact"("type");

CREATE UNIQUE INDEX "flooring_work_order_sales_rep_workOrderId_contactId_key"
ON "flooring_work_order_sales_rep"("workOrderId", "contactId");

CREATE INDEX "flooring_work_order_sales_rep_workOrderId_idx"
ON "flooring_work_order_sales_rep"("workOrderId");

CREATE INDEX "flooring_work_order_sales_rep_contactId_idx"
ON "flooring_work_order_sales_rep"("contactId");

CREATE INDEX "flooring_work_order_sales_rep_workOrderId_createdAt_idx"
ON "flooring_work_order_sales_rep"("workOrderId", "createdAt");

ALTER TABLE "flooring_work_order_sales_rep"
ADD CONSTRAINT "flooring_work_order_sales_rep_workOrderId_fkey"
FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "flooring_work_order_sales_rep"
ADD CONSTRAINT "flooring_work_order_sales_rep_contactId_fkey"
FOREIGN KEY ("contactId") REFERENCES "flooring_contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
