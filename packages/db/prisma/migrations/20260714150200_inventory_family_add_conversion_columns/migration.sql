-- =====================================================================
-- The conversion trio on the four transactional row tables:
--   coverageUnitId       (FK → flooring_unit_of_measure, RESTRICT, nullable)
--   coveragePerUnit      (DECIMAL(12,4), nullable)
--   conversionFormulaId  (FK → flooring_conversion_formula, RESTRICT, nullable)
--
-- All editable + seeded from the product on product-select (adjustments seed from
-- the parent inventory at create; the worker materializes staged → inventory
-- verbatim). `convertedBalance` + the target unit are DERIVED ON-READ — nothing
-- converted is stored. All additive-nullable ⇒ no backfill.
-- =====================================================================

-- AlterTable: flooring_inventory
ALTER TABLE "flooring_inventory" ADD COLUMN     "coverageUnitId" TEXT,
ADD COLUMN     "coveragePerUnit" DECIMAL(12,4),
ADD COLUMN     "conversionFormulaId" TEXT;

-- AlterTable: flooring_inventory_adjustment
ALTER TABLE "flooring_inventory_adjustment" ADD COLUMN     "coverageUnitId" TEXT,
ADD COLUMN     "coveragePerUnit" DECIMAL(12,4),
ADD COLUMN     "conversionFormulaId" TEXT;

-- AlterTable: flooring_import_staged_inventory_row
ALTER TABLE "flooring_import_staged_inventory_row" ADD COLUMN     "coverageUnitId" TEXT,
ADD COLUMN     "coveragePerUnit" DECIMAL(12,4),
ADD COLUMN     "conversionFormulaId" TEXT;

-- AlterTable: flooring_import_staged_inventory_filter_row
ALTER TABLE "flooring_import_staged_inventory_filter_row" ADD COLUMN     "coverageUnitId" TEXT,
ADD COLUMN     "coveragePerUnit" DECIMAL(12,4),
ADD COLUMN     "conversionFormulaId" TEXT;

-- CreateIndex
CREATE INDEX "flooring_inventory_coverageUnitId_idx" ON "flooring_inventory"("coverageUnitId");
CREATE INDEX "flooring_inventory_conversionFormulaId_idx" ON "flooring_inventory"("conversionFormulaId");
CREATE INDEX "flooring_inventory_adjustment_coverageUnitId_idx" ON "flooring_inventory_adjustment"("coverageUnitId");
CREATE INDEX "flooring_inventory_adjustment_conversionFormulaId_idx" ON "flooring_inventory_adjustment"("conversionFormulaId");
CREATE INDEX "flooring_import_staged_inventory_row_coverageUnitId_idx" ON "flooring_import_staged_inventory_row"("coverageUnitId");
CREATE INDEX "flooring_import_staged_inventory_row_conversionFormulaId_idx" ON "flooring_import_staged_inventory_row"("conversionFormulaId");
CREATE INDEX "flooring_import_staged_inventory_filter_row_coverageUnitId_idx" ON "flooring_import_staged_inventory_filter_row"("coverageUnitId");
CREATE INDEX "flooring_import_staged_inventory_filter_row_conversionFormulaId_idx" ON "flooring_import_staged_inventory_filter_row"("conversionFormulaId");

-- AddForeignKey: flooring_inventory
ALTER TABLE "flooring_inventory" ADD CONSTRAINT "flooring_inventory_coverageUnitId_fkey" FOREIGN KEY ("coverageUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "flooring_inventory" ADD CONSTRAINT "flooring_inventory_conversionFormulaId_fkey" FOREIGN KEY ("conversionFormulaId") REFERENCES "flooring_conversion_formula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: flooring_inventory_adjustment
ALTER TABLE "flooring_inventory_adjustment" ADD CONSTRAINT "flooring_inventory_adjustment_coverageUnitId_fkey" FOREIGN KEY ("coverageUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "flooring_inventory_adjustment" ADD CONSTRAINT "flooring_inventory_adjustment_conversionFormulaId_fkey" FOREIGN KEY ("conversionFormulaId") REFERENCES "flooring_conversion_formula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: flooring_import_staged_inventory_row
ALTER TABLE "flooring_import_staged_inventory_row" ADD CONSTRAINT "flooring_import_staged_inventory_row_coverageUnitId_fkey" FOREIGN KEY ("coverageUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "flooring_import_staged_inventory_row" ADD CONSTRAINT "flooring_import_staged_inventory_row_conversionFormulaId_fkey" FOREIGN KEY ("conversionFormulaId") REFERENCES "flooring_conversion_formula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: flooring_import_staged_inventory_filter_row
ALTER TABLE "flooring_import_staged_inventory_filter_row" ADD CONSTRAINT "flooring_import_staged_inventory_filter_row_coverageUnitId_fkey" FOREIGN KEY ("coverageUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "flooring_import_staged_inventory_filter_row" ADD CONSTRAINT "flooring_import_staged_inventory_filter_row_conversionFormulaId_fkey" FOREIGN KEY ("conversionFormulaId") REFERENCES "flooring_conversion_formula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
