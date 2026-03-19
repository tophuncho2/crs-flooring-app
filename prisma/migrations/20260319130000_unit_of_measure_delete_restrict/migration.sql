ALTER TABLE "flooring_category" DROP CONSTRAINT IF EXISTS "flooring_category_sendUnitId_fkey";
ALTER TABLE "flooring_category" DROP CONSTRAINT IF EXISTS "flooring_category_stockUnitId_fkey";
ALTER TABLE "flooring_category" DROP CONSTRAINT IF EXISTS "flooring_category_coverageAvailableUnitId_fkey";
ALTER TABLE "flooring_category" DROP CONSTRAINT IF EXISTS "flooring_category_itemCoverageUnitId_fkey";
ALTER TABLE "flooring_category" DROP CONSTRAINT IF EXISTS "flooring_category_serviceUnitId_fkey";

ALTER TABLE "flooring_category"
ADD CONSTRAINT "flooring_category_sendUnitId_fkey"
FOREIGN KEY ("sendUnitId")
REFERENCES "flooring_unit_of_measure"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "flooring_category"
ADD CONSTRAINT "flooring_category_stockUnitId_fkey"
FOREIGN KEY ("stockUnitId")
REFERENCES "flooring_unit_of_measure"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "flooring_category"
ADD CONSTRAINT "flooring_category_coverageAvailableUnitId_fkey"
FOREIGN KEY ("coverageAvailableUnitId")
REFERENCES "flooring_unit_of_measure"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "flooring_category"
ADD CONSTRAINT "flooring_category_itemCoverageUnitId_fkey"
FOREIGN KEY ("itemCoverageUnitId")
REFERENCES "flooring_unit_of_measure"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "flooring_category"
ADD CONSTRAINT "flooring_category_serviceUnitId_fkey"
FOREIGN KEY ("serviceUnitId")
REFERENCES "flooring_unit_of_measure"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
