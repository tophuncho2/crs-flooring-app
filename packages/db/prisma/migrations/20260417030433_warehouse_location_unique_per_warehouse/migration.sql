DROP INDEX IF EXISTS "flooring_location_sectionId_rafter_level_key";
CREATE UNIQUE INDEX "flooring_location_warehouseId_rafter_level_key" ON "flooring_location"("warehouseId", "rafter", "level");
