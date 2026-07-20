// Canonical conversion-formula seed set (TypeScript source of truth).
// Keep in sync with packages/db/scripts/seed-conversion-formulas.js.
//
// A formula names HOW to turn a stock balance in one unit into a displayed
// balance in another. It is a flat, seed-managed lookup — `convertedBalance` +
// the target unit derive ON-READ (never stored). `fromUnitName`/`toUnitName`
// resolve to unit ids by NAME at seed time (ids differ per env). `CONSTANT`
// mode uses `constantFactor`; `USE_COVERAGE_PER_UNIT` uses the consuming row's
// own `coveragePerUnit` (so one shared formula serves every product).
//
// Formulas A & B already exist on live DBs (added by migrations
// 20260714150000 + 20260716140000); the seed create-if-missing makes them
// no-ops there and creates only the new C. Use "Boxes" (not "Box") — the
// seeded UoM name.
export const SEEDED_CONVERSION_FORMULAS = [
  {
    name: "Linear Ft → Sq Yd (×1.333)",
    fromUnitName: "Linear Feet",
    toUnitName: "Square Yard",
    operator: "MULTIPLY",
    factorMode: "CONSTANT",
    constantFactor: "1.3330",
  },
  {
    name: "Sq Ft → Boxes (÷ coverage)",
    fromUnitName: "Square Feet",
    toUnitName: "Boxes",
    operator: "DIVIDE",
    factorMode: "USE_COVERAGE_PER_UNIT",
    constantFactor: null,
  },
  {
    name: "Sq Yd → Boxes (÷ coverage)",
    fromUnitName: "Square Yard",
    toUnitName: "Boxes",
    operator: "DIVIDE",
    factorMode: "USE_COVERAGE_PER_UNIT",
    constantFactor: null,
  },
] as const

export type SeededConversionFormula = (typeof SEEDED_CONVERSION_FORMULAS)[number]
