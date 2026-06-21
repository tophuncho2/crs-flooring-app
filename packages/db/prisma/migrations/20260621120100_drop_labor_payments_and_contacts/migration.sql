-- DropForeignKey
ALTER TABLE "flooring_labor_payment" DROP CONSTRAINT "flooring_labor_payment_workOrderId_fkey";
ALTER TABLE "flooring_labor_payment" DROP CONSTRAINT "flooring_labor_payment_contactId_fkey";

-- DropTable
DROP TABLE "flooring_labor_payment";
DROP TABLE "flooring_contact";
