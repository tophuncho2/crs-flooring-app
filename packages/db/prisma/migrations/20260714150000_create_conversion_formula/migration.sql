-- =====================================================================
-- Unit conversion: enums + read-only FlooringConversionFormula lookup.
--
-- A conversion formula names HOW to turn a stock balance in one unit into a
-- displayed balance in another (planks: sq ft ÷ sq-ft-per-box = boxes; carpet:
-- linear ft × 1.333 = sq yd). It is a flat, migration-seeded, read-only lookup —
-- no CRUD (mirrors UoM/Category). Products and inventory/adjustment/staged rows
-- reference a formula; `convertedBalance` + the target unit are DERIVED ON-READ
-- (never stored).
--
--   • operator        DIVIDE | MULTIPLY
--   • factorMode      CONSTANT (uses constantFactor, e.g. carpet ×1.333)
--                     | USE_COVERAGE_PER_UNIT (uses the consuming row's own
--                       coveragePerUnit, e.g. planks ÷ sq-ft-per-box)
--   • constantFactor  the CONSTANT multiplier/divisor; NULL for USE_COVERAGE.
--   • fromUnitId       source-unit guard: the derived value blanks when a row's
--                     own unit does not match the formula's from-unit.
--
-- CHECK enforces factorMode=CONSTANT ⇒ constantFactor NOT NULL so a mis-seeded
-- constant formula can never silently fall back to a blank conversion. Unit FKs
-- RESTRICT (formulas outlive individual UoM edits). Seed rows live at the bottom;
-- adjust the seed set to the live UoM ids on each environment.
-- =====================================================================

-- CreateEnum
CREATE TYPE "FlooringConversionOperator" AS ENUM ('DIVIDE', 'MULTIPLY');

-- CreateEnum
CREATE TYPE "FlooringConversionFactorMode" AS ENUM ('CONSTANT', 'USE_COVERAGE_PER_UNIT');

-- CreateTable
CREATE TABLE "flooring_conversion_formula" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fromUnitId" TEXT NOT NULL,
    "toUnitId" TEXT NOT NULL,
    "operator" "FlooringConversionOperator" NOT NULL,
    "factorMode" "FlooringConversionFactorMode" NOT NULL,
    "constantFactor" DECIMAL(12,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_conversion_formula_pkey" PRIMARY KEY ("id")
);

-- CHECK: a CONSTANT-mode formula must carry a constantFactor.
ALTER TABLE "flooring_conversion_formula"
  ADD CONSTRAINT "flooring_conversion_formula_constant_factor_check"
  CHECK ("factorMode" <> 'CONSTANT' OR "constantFactor" IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "flooring_conversion_formula_name_key" ON "flooring_conversion_formula"("name");

-- CreateIndex
CREATE INDEX "flooring_conversion_formula_fromUnitId_idx" ON "flooring_conversion_formula"("fromUnitId");

-- CreateIndex
CREATE INDEX "flooring_conversion_formula_toUnitId_idx" ON "flooring_conversion_formula"("toUnitId");

-- AddForeignKey
ALTER TABLE "flooring_conversion_formula" ADD CONSTRAINT "flooring_conversion_formula_fromUnitId_fkey" FOREIGN KEY ("fromUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_conversion_formula" ADD CONSTRAINT "flooring_conversion_formula_toUnitId_fkey" FOREIGN KEY ("toUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- Seed rows. Resolved by unit NAME so the same file is portable across envs
-- (unit ids differ per environment). Each INSERT is a no-op if the required
-- units are absent or the formula name already exists. Extend this list as the
-- category/product conversions are finalized.
--   • Carpet: linear ft × 1.333 → sq yd   (CONSTANT)
--   • Planks: sq ft ÷ coveragePerUnit → box (USE_COVERAGE_PER_UNIT)
-- Unit names below assume the seeded UoM set; edit to match live UoM labels.
-- =====================================================================

INSERT INTO "flooring_conversion_formula" ("id", "name", "fromUnitId", "toUnitId", "operator", "factorMode", "constantFactor", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Linear Ft → Sq Yd (×1.333)', src."id", dst."id", 'MULTIPLY', 'CONSTANT', 1.3330, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "flooring_unit_of_measure" src, "flooring_unit_of_measure" dst
WHERE src."name" = 'Linear Feet' AND dst."name" = 'Square Yard'
  AND NOT EXISTS (SELECT 1 FROM "flooring_conversion_formula" f WHERE f."name" = 'Linear Ft → Sq Yd (×1.333)');

INSERT INTO "flooring_conversion_formula" ("id", "name", "fromUnitId", "toUnitId", "operator", "factorMode", "constantFactor", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Sq Ft → Boxes (÷ coverage)', src."id", dst."id", 'DIVIDE', 'USE_COVERAGE_PER_UNIT', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "flooring_unit_of_measure" src, "flooring_unit_of_measure" dst
WHERE src."name" = 'Square Feet' AND dst."name" = 'Box'
  AND NOT EXISTS (SELECT 1 FROM "flooring_conversion_formula" f WHERE f."name" = 'Sq Ft → Boxes (÷ coverage)');
