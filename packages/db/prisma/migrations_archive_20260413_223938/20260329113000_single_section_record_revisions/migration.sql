ALTER TABLE "flooring_category"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "flooring_unit_of_measure"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "flooring_category_name_ci_key"
ON "flooring_category" (LOWER("name"));

CREATE UNIQUE INDEX "flooring_unit_of_measure_name_ci_key"
ON "flooring_unit_of_measure" (LOWER("name"));

CREATE UNIQUE INDEX "flooring_manufacturer_company_name_ci_key"
ON "flooring_manufacturer" (LOWER("companyName"));
