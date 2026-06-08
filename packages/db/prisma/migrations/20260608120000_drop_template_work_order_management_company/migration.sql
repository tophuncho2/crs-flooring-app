-- =====================================================================
-- Drop the stored management_company link from templates and work orders.
--
-- A template's / work order's management company is purely a function of
-- its linked property (the required propertyId FK). Storing a second copy
-- on these rows let it drift / mismatch and could be set when the property
-- had no MC. The app now reads the MC through the property relation
-- (property.managementCompany), so these columns are dead.
--
-- DROP COLUMN cascades the owning FK constraint + single-column index, but
-- they are dropped explicitly here to mirror Prisma's generated output.
-- property_hub.managementCompanyId (the source of truth) is untouched.
-- =====================================================================

-- DropForeignKey
ALTER TABLE "flooring_template" DROP CONSTRAINT "flooring_template_managementCompanyId_fkey";

-- DropForeignKey
ALTER TABLE "flooring_work_order" DROP CONSTRAINT "flooring_work_order_managementCompanyId_fkey";

-- DropIndex
DROP INDEX "flooring_template_managementCompanyId_idx";

-- DropIndex
DROP INDEX "flooring_work_order_managementCompanyId_idx";

-- AlterTable
ALTER TABLE "flooring_template" DROP COLUMN "managementCompanyId";

-- AlterTable
ALTER TABLE "flooring_work_order" DROP COLUMN "managementCompanyId";
