-- Step 1: Add new columns as nullable
ALTER TABLE "flooring_location" ADD COLUMN "rafter" INTEGER;
ALTER TABLE "flooring_location" ADD COLUMN "level" INTEGER;

-- Step 2: Backfill (no-op — staging tables are empty, verified by pre-flight check)

-- Step 3: Promote new columns to NOT NULL
ALTER TABLE "flooring_location" ALTER COLUMN "rafter" SET NOT NULL;
ALTER TABLE "flooring_location" ALTER COLUMN "level" SET NOT NULL;

-- Step 4: Drop old unique index
DROP INDEX IF EXISTS "flooring_location_warehouseId_locationCode_key";

-- Step 5: Drop old column
ALTER TABLE "flooring_location" DROP COLUMN "locationCode";

-- Step 6: Create new unique constraint
CREATE UNIQUE INDEX "flooring_location_sectionId_rafter_level_key" ON "flooring_location"("sectionId", "rafter", "level");

-- Step 7: Add lookup index for dropdown reads
CREATE INDEX "flooring_location_warehouseId_idx" ON "flooring_location"("warehouseId");
