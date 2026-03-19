INSERT INTO "flooring_section" ("id", "warehouseId", "name", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || source."warehouseId")::uuid::text,
  source."warehouseId",
  'Unassigned',
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT "warehouseId"
  FROM "flooring_location"
  WHERE "sectionId" IS NULL
) AS source
WHERE NOT EXISTS (
  SELECT 1
  FROM "flooring_section" existing
  WHERE existing."warehouseId" = source."warehouseId"
    AND existing."name" = 'Unassigned'
);

UPDATE "flooring_location" location
SET "sectionId" = section."id"
FROM "flooring_section" section
WHERE location."sectionId" IS NULL
  AND section."warehouseId" = location."warehouseId"
  AND section."name" = 'Unassigned';

ALTER TABLE "flooring_location" DROP CONSTRAINT "flooring_location_sectionId_fkey";

ALTER TABLE "flooring_location"
ALTER COLUMN "sectionId" SET NOT NULL;

ALTER TABLE "flooring_location"
ADD CONSTRAINT "flooring_location_sectionId_fkey"
FOREIGN KEY ("sectionId") REFERENCES "flooring_section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
