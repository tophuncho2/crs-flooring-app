export const SEEDED_JOB_TYPES = [
  { name: "Carpet Cleaning" },
  { name: "Plank" },
  { name: "Carpet" },
  { name: "Trim" },
  { name: "Wall Base" },
  { name: "Waste" },
  { name: "Repair" },
  { name: "Construction" },
] as const

export type SeededJobType = (typeof SEEDED_JOB_TYPES)[number]
