ALTER TABLE "flooring_manufacturer"
RENAME COLUMN "name" TO "agentName";

UPDATE "flooring_manufacturer"
SET "companyName" = COALESCE(NULLIF("companyName", ''), COALESCE("agentName", ''));

DROP INDEX IF EXISTS "flooring_manufacturer_name_key";

ALTER TABLE "flooring_manufacturer"
ALTER COLUMN "companyName" SET NOT NULL;

CREATE UNIQUE INDEX "flooring_manufacturer_companyName_key"
ON "flooring_manufacturer"("companyName");
