-- Management companies and properties may share display names.
-- Drop both uniqueness paths; property's normalized column was uniqueness-only.
DROP INDEX "flooring_management_company_name_key";

DROP INDEX "property_hub_nameNormalized_key";
ALTER TABLE "property_hub" DROP COLUMN "nameNormalized";
