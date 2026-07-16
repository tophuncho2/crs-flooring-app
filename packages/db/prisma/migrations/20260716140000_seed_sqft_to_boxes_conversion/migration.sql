-- =====================================================================
-- Seed the Sq Ft → Boxes conversion formula that the original create
-- migration (20260714150000) missed: it resolved dst."name" = 'Box' but the
-- seeded UoM is named 'Boxes', so the INSERT was a silent no-op. Re-attempt
-- with the correct name. Resolved by unit NAME (env-portable) + idempotent
-- NOT EXISTS on the formula name, matching the original convention.
--   • Planks: sq ft ÷ coveragePerUnit → box (USE_COVERAGE_PER_UNIT, DIVIDE)
-- =====================================================================

INSERT INTO "flooring_conversion_formula" ("id", "name", "fromUnitId", "toUnitId", "operator", "factorMode", "constantFactor", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Sq Ft → Boxes (÷ coverage)', src."id", dst."id", 'DIVIDE', 'USE_COVERAGE_PER_UNIT', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "flooring_unit_of_measure" src, "flooring_unit_of_measure" dst
WHERE src."name" = 'Square Feet' AND dst."name" = 'Boxes'
  AND NOT EXISTS (SELECT 1 FROM "flooring_conversion_formula" f WHERE f."name" = 'Sq Ft → Boxes (÷ coverage)');
