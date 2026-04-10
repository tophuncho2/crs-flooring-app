export const SEEDED_UNIT_OF_MEASURES = [
  { name: "Linear Feet" },
  { name: "Square Feet" },
  { name: "Square Yard" },
  { name: "Buckets" },
  { name: "Boxes" },
  { name: "Units" },
  { name: "Bags" },
  { name: "Pieces" },
  { name: "Sheets" },
  { name: "Rolls" },
] as const

export type SeededUnitOfMeasure = (typeof SEEDED_UNIT_OF_MEASURES)[number]
