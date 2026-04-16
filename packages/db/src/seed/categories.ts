export const SEEDED_CATEGORIES = [
  {
    slug: "vinyl-plank",
    name: "Vinyl Plank",
    sendUnitSlug: "square-feet",
    stockUnitSlug: "boxes",
    coverageAvailableUnitSlug: "square-feet",
    itemCoverageUnitSlug: "square-feet",
    serviceUnitSlug: null,
  },
] as const

export type SeededCategory = (typeof SEEDED_CATEGORIES)[number]
