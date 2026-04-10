export const SEEDED_UNIT_OF_MEASURES = [
  { slug: "linear-feet", name: "Linear Feet", abbreviation: "lf" },
  { slug: "square-feet", name: "Square Feet", abbreviation: "sqft" },
  { slug: "square-yard", name: "Square Yard", abbreviation: "sqyd" },
  { slug: "buckets", name: "Buckets", abbreviation: "bkt" },
  { slug: "boxes", name: "Boxes", abbreviation: "bx" },
  { slug: "units", name: "Units", abbreviation: "ea" },
  { slug: "bags", name: "Bags", abbreviation: "bag" },
  { slug: "pieces", name: "Pieces", abbreviation: "pc" },
  { slug: "sheets", name: "Sheets", abbreviation: "sht" },
  { slug: "rolls", name: "Rolls", abbreviation: "rl" },
  { slug: "gallons", name: "Gallons", abbreviation: "gal" },
] as const

export type SeededUnitOfMeasure = (typeof SEEDED_UNIT_OF_MEASURES)[number]
