-- Drop the FlooringService and FlooringContact models entirely.
-- Both models lost their consumers when the supporting junction tables
-- (flooring_template_service_item, flooring_work_order_service_item,
-- flooring_template_sales_rep, flooring_work_order_sales_rep) were dropped
-- in 20260423152350_management_system_alteration. The data, domain, and
-- application code layers were removed in the preceding code-only commit.

-- DropForeignKey (flooring_service.unitId -> flooring_unit_of_measure.id)
ALTER TABLE "flooring_service" DROP CONSTRAINT "flooring_service_unitId_fkey";

-- DropTable
DROP TABLE "flooring_service";

-- DropTable
DROP TABLE "flooring_contact";

-- DropEnum
DROP TYPE "FlooringContactType";
