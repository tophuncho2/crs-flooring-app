export const SEEDED_CATEGORIES = [
  // Slug retained for snapshot stability; display name changed from "Vinyl Plank" → "Plank" 2026-05-07.
  {
    slug: "vinyl-plank",
    name: "Plank",
    sendUnitSlug: "square-feet",
    stockUnitSlug: "square-feet",
  },
  {
    slug: "carpet-tile",
    name: "Carpet Tile",
    sendUnitSlug: "square-yard",
    stockUnitSlug: "square-yard",
  },
  {
    slug: "covebase",
    name: "Covebase",
    sendUnitSlug: "linear-feet",
    stockUnitSlug: "linear-feet",
  },
  {
    slug: "pad",
    name: "Pad",
    sendUnitSlug: "square-yard",
    stockUnitSlug: "square-yard",
  },
  {
    slug: "adhesive",
    name: "Adhesive",
    sendUnitSlug: "buckets",
    stockUnitSlug: "buckets",
  },
  {
    slug: "baseboard",
    name: "Baseboard",
    sendUnitSlug: "pieces",
    stockUnitSlug: "pieces",
  },
  {
    slug: "carpet",
    name: "Carpet",
    sendUnitSlug: "linear-feet",
    stockUnitSlug: "linear-feet",
  },
  {
    slug: "kilz",
    name: "Kilz",
    sendUnitSlug: "units",
    stockUnitSlug: "units",
  },
  {
    slug: "luan",
    name: "Luan",
    sendUnitSlug: "sheets",
    stockUnitSlug: "sheets",
  },
  {
    slug: "metals",
    name: "Metals",
    sendUnitSlug: "pieces",
    stockUnitSlug: "pieces",
  },
  {
    slug: "moisture-barrier",
    name: "Moisture Barrier",
    sendUnitSlug: "units",
    stockUnitSlug: "units",
  },
  {
    slug: "patch",
    name: "Patch",
    sendUnitSlug: "bags",
    stockUnitSlug: "bags",
  },
  {
    slug: "plywood",
    name: "Plywood",
    sendUnitSlug: "sheets",
    stockUnitSlug: "sheets",
  },
  {
    slug: "primer",
    name: "Primer",
    sendUnitSlug: "units",
    stockUnitSlug: "units",
  },
  {
    slug: "scent-stop",
    name: "Scent Stop",
    sendUnitSlug: "units",
    stockUnitSlug: "units",
  },
  {
    slug: "shoe-molding",
    name: "Shoe Molding",
    sendUnitSlug: "linear-feet",
    stockUnitSlug: "linear-feet",
  },
  {
    slug: "trim",
    name: "Trim",
    sendUnitSlug: "pieces",
    stockUnitSlug: "pieces",
  },
  {
    slug: "vct",
    name: "VCT",
    sendUnitSlug: "boxes",
    stockUnitSlug: "boxes",
  },
  {
    slug: "vinyl-sheet",
    name: "Vinyl Sheet",
    sendUnitSlug: "linear-feet",
    stockUnitSlug: "linear-feet",
  },
  {
    slug: "wax-ring",
    name: "Wax Ring",
    sendUnitSlug: "boxes",
    stockUnitSlug: "boxes",
  },
  {
    slug: "ceramic-tile",
    name: "Ceramic Tile",
    sendUnitSlug: "square-feet",
    stockUnitSlug: "square-feet",
  },
  {
    slug: "stair-treads",
    name: "Stair Treads",
    sendUnitSlug: "pieces",
    stockUnitSlug: "pieces",
  },
  {
    slug: "rubber-transition",
    name: "Rubber Transition",
    sendUnitSlug: "pieces",
    stockUnitSlug: "pieces",
  },
] as const

export type SeededCategory = (typeof SEEDED_CATEGORIES)[number]
