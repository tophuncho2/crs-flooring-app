export const SEEDED_CATEGORIES = [
  // Slug retained for snapshot stability; display name changed from "Vinyl Plank" → "Plank" 2026-05-07.
  { slug: "vinyl-plank", name: "Plank" },
  { slug: "carpet-tile", name: "Carpet Tile" },
  { slug: "covebase", name: "Covebase" },
  { slug: "pad", name: "Pad" },
  { slug: "adhesive", name: "Adhesive" },
  { slug: "baseboard", name: "Baseboard" },
  { slug: "carpet", name: "Carpet" },
  { slug: "kilz", name: "Kilz" },
  { slug: "luan", name: "Luan" },
  { slug: "metals", name: "Metals" },
  { slug: "moisture-barrier", name: "Moisture Barrier" },
  { slug: "patch", name: "Patch" },
  { slug: "plywood", name: "Plywood" },
  { slug: "primer", name: "Primer" },
  { slug: "scent-stop", name: "Scent Stop" },
  { slug: "shoe-molding", name: "Shoe Molding" },
  { slug: "trim", name: "Trim" },
  { slug: "vct", name: "VCT" },
  { slug: "vinyl-sheet", name: "Vinyl Sheet" },
  { slug: "wax-ring", name: "Wax Ring" },
  { slug: "ceramic-tile", name: "Ceramic Tile" },
  { slug: "stair-treads", name: "Stair Treads" },
  { slug: "rubber-transition", name: "Rubber Transition" },
] as const

export type SeededCategory = (typeof SEEDED_CATEGORIES)[number]
