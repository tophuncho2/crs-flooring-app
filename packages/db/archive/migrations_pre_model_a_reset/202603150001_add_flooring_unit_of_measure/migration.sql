CREATE TABLE "flooring_unit_of_measure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_unit_of_measure_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "flooring_unit_of_measure_name_key" ON "flooring_unit_of_measure"("name");

ALTER TABLE "flooring_category"
ADD COLUMN "sendUnitId" TEXT,
ADD COLUMN "stockUnitId" TEXT,
ADD COLUMN "coverageAvailableUnitId" TEXT,
ADD COLUMN "itemCoverageUnitId" TEXT;

INSERT INTO "flooring_unit_of_measure" ("id", "name")
SELECT gen_random_uuid()::text, unit_name
FROM (
    SELECT DISTINCT TRIM("sendUnit") AS unit_name
    FROM "flooring_category"
    WHERE "sendUnit" IS NOT NULL AND TRIM("sendUnit") <> ''
    UNION
    SELECT DISTINCT TRIM("stockUnit") AS unit_name
    FROM "flooring_category"
    WHERE "stockUnit" IS NOT NULL AND TRIM("stockUnit") <> ''
    UNION
    SELECT DISTINCT TRIM("coverageAvailableUnit") AS unit_name
    FROM "flooring_category"
    WHERE "coverageAvailableUnit" IS NOT NULL AND TRIM("coverageAvailableUnit") <> ''
    UNION
    SELECT DISTINCT TRIM("itemCoverageUnit") AS unit_name
    FROM "flooring_category"
    WHERE "itemCoverageUnit" IS NOT NULL AND TRIM("itemCoverageUnit") <> ''
) units
ON CONFLICT ("name") DO NOTHING;

UPDATE "flooring_category" category
SET "sendUnitId" = unit_table."id"
FROM "flooring_unit_of_measure" unit_table
WHERE category."sendUnit" IS NOT NULL
  AND TRIM(category."sendUnit") <> ''
  AND unit_table."name" = TRIM(category."sendUnit");

UPDATE "flooring_category" category
SET "stockUnitId" = unit_table."id"
FROM "flooring_unit_of_measure" unit_table
WHERE category."stockUnit" IS NOT NULL
  AND TRIM(category."stockUnit") <> ''
  AND unit_table."name" = TRIM(category."stockUnit");

UPDATE "flooring_category" category
SET "coverageAvailableUnitId" = unit_table."id"
FROM "flooring_unit_of_measure" unit_table
WHERE category."coverageAvailableUnit" IS NOT NULL
  AND TRIM(category."coverageAvailableUnit") <> ''
  AND unit_table."name" = TRIM(category."coverageAvailableUnit");

UPDATE "flooring_category" category
SET "itemCoverageUnitId" = unit_table."id"
FROM "flooring_unit_of_measure" unit_table
WHERE category."itemCoverageUnit" IS NOT NULL
  AND TRIM(category."itemCoverageUnit") <> ''
  AND unit_table."name" = TRIM(category."itemCoverageUnit");

ALTER TABLE "flooring_category"
DROP COLUMN "sendUnit",
DROP COLUMN "stockUnit",
DROP COLUMN "coverageAvailableUnit",
DROP COLUMN "itemCoverageUnit";

CREATE INDEX "flooring_category_sendUnitId_idx" ON "flooring_category"("sendUnitId");
CREATE INDEX "flooring_category_stockUnitId_idx" ON "flooring_category"("stockUnitId");
CREATE INDEX "flooring_category_coverageAvailableUnitId_idx" ON "flooring_category"("coverageAvailableUnitId");
CREATE INDEX "flooring_category_itemCoverageUnitId_idx" ON "flooring_category"("itemCoverageUnitId");

ALTER TABLE "flooring_category"
ADD CONSTRAINT "flooring_category_sendUnitId_fkey"
FOREIGN KEY ("sendUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "flooring_category"
ADD CONSTRAINT "flooring_category_stockUnitId_fkey"
FOREIGN KEY ("stockUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "flooring_category"
ADD CONSTRAINT "flooring_category_coverageAvailableUnitId_fkey"
FOREIGN KEY ("coverageAvailableUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "flooring_category"
ADD CONSTRAINT "flooring_category_itemCoverageUnitId_fkey"
FOREIGN KEY ("itemCoverageUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
