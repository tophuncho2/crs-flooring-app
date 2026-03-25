ALTER TABLE "property_hub"
ALTER COLUMN "managementCompanyId" DROP NOT NULL;

ALTER TABLE "property_hub" DROP CONSTRAINT IF EXISTS "property_hub_managementCompanyId_fkey";

ALTER TABLE "property_hub"
ADD CONSTRAINT "property_hub_managementCompanyId_fkey"
FOREIGN KEY ("managementCompanyId")
REFERENCES "flooring_management_company"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
