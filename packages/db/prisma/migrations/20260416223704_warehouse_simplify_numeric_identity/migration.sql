-- Step 1: Add number columns as nullable
ALTER TABLE "flooring_warehouse" ADD COLUMN "number" INTEGER;
ALTER TABLE "flooring_section" ADD COLUMN "number" INTEGER;

-- Step 2: Backfill
-- Warehouses: monotonic numbering by createdAt ASC, starting at 1
WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "flooring_warehouse"
)
UPDATE "flooring_warehouse" w
SET "number" = numbered.rn
FROM numbered
WHERE w."id" = numbered."id";

-- Sections: per-warehouse monotonic numbering by createdAt ASC, starting at 1
WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "warehouseId" ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "flooring_section"
)
UPDATE "flooring_section" s
SET "number" = numbered.rn
FROM numbered
WHERE s."id" = numbered."id";

-- Step 3: Promote to NOT NULL
ALTER TABLE "flooring_warehouse" ALTER COLUMN "number" SET NOT NULL;
ALTER TABLE "flooring_section" ALTER COLUMN "number" SET NOT NULL;

-- Step 4: Drop slug and name columns + their unique indexes
DROP INDEX IF EXISTS "flooring_warehouse_slug_key";
ALTER TABLE "flooring_warehouse" DROP COLUMN "slug";

DROP INDEX IF EXISTS "flooring_section_warehouseId_slug_key";
DROP INDEX IF EXISTS "flooring_section_warehouseId_name_key";
ALTER TABLE "flooring_section" DROP COLUMN "slug";
ALTER TABLE "flooring_section" DROP COLUMN "name";

-- Step 5: Add new unique constraints for number
CREATE UNIQUE INDEX "flooring_warehouse_number_key" ON "flooring_warehouse"("number");
CREATE UNIQUE INDEX "flooring_section_warehouseId_number_key" ON "flooring_section"("warehouseId", "number");
