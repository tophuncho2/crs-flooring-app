-- Drop all three legacy uniqueness indexes on companyName
DROP INDEX "flooring_manufacturer_companyName_key";
DROP INDEX "flooring_manufacturer_company_name_ci_key";
DROP INDEX "flooring_manufacturer_companyName_lower_key";

-- Add normalized column
ALTER TABLE "flooring_manufacturer"
ADD COLUMN "companyNameNormalized" TEXT NOT NULL DEFAULT '';

-- Backfill existing rows (table is currently empty, but safe for future)
UPDATE "flooring_manufacturer"
SET "companyNameNormalized" = LOWER(TRIM("companyName"));

-- Remove default now that backfill is done
ALTER TABLE "flooring_manufacturer"
ALTER COLUMN "companyNameNormalized" DROP DEFAULT;

-- Prisma-managed unique index
CREATE UNIQUE INDEX "flooring_manufacturer_companyNameNormalized_key"
ON "flooring_manufacturer"("companyNameNormalized");
