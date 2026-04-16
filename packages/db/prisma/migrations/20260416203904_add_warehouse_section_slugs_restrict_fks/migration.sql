-- Step 1: Add slug columns as nullable
ALTER TABLE "flooring_warehouse" ADD COLUMN "slug" TEXT;
ALTER TABLE "flooring_section" ADD COLUMN "slug" TEXT;

-- Step 2: Backfill existing rows (safe no-op on empty tables)
UPDATE "flooring_warehouse"
SET "slug" = lower(regexp_replace(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
WHERE "slug" IS NULL;

UPDATE "flooring_section"
SET "slug" = lower(regexp_replace(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
WHERE "slug" IS NULL;

-- Step 3: Promote to NOT NULL + add unique constraints
ALTER TABLE "flooring_warehouse" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "flooring_section" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "flooring_warehouse_slug_key" ON "flooring_warehouse"("slug");
CREATE UNIQUE INDEX "flooring_section_warehouseId_slug_key" ON "flooring_section"("warehouseId", "slug");

-- Step 4: Recreate warehouse FKs with onDelete: Restrict
ALTER TABLE "flooring_section" DROP CONSTRAINT "flooring_section_warehouseId_fkey";
ALTER TABLE "flooring_section"
  ADD CONSTRAINT "flooring_section_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "flooring_location" DROP CONSTRAINT "flooring_location_warehouseId_fkey";
ALTER TABLE "flooring_location"
  ADD CONSTRAINT "flooring_location_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
