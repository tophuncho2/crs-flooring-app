export const SEEDED_UNIT_OF_MEASURES = [
  { name: "Linear Feet", abbreviation: "lf" },
  { name: "Square Feet", abbreviation: "sqft" },
  { name: "Square Yard", abbreviation: "sqyd" },
  { name: "Buckets", abbreviation: "bkt" },
  { name: "Boxes", abbreviation: "bx" },
  { name: "Units", abbreviation: "ea" },
  { name: "Bags", abbreviation: "bag" },
  { name: "Pieces", abbreviation: "pc" },
  { name: "Sheets", abbreviation: "sht" },
  { name: "Rolls", abbreviation: "rl" },
  { name: "Gallons", abbreviation: "gal" },
  { name: "Tubes", abbreviation: "tbs" },
] as const

export type SeededUnitOfMeasure = (typeof SEEDED_UNIT_OF_MEASURES)[number]
