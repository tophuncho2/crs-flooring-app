// Entity-type palette value object: the canonical NON-semantic color set.
// User-assigned, meaningless in code — purely a visual tag. This is the
// persistence/validation source of truth; the matching Prisma enum is
// `FlooringEntityTypeColor`, and the UI class map is the data-driven sibling
// at apps/web/engines/common/badges/contracts/color-palette.ts (kept in sync
// by hand — same string keys, two layers). Pure data, no I/O.

export const ENTITY_TYPE_COLORS = [
  "SLATE",
  "RED",
  "AMBER",
  "ORANGE",
  "LIME",
  "GREEN",
  "TEAL",
  "CYAN",
  "BLUE",
  "VIOLET",
  "PINK",
  "ROSE",
] as const

export type EntityTypeColor = (typeof ENTITY_TYPE_COLORS)[number]

export const DEFAULT_ENTITY_TYPE_COLOR: EntityTypeColor = "SLATE"

export function isEntityTypeColor(value: unknown): value is EntityTypeColor {
  return typeof value === "string" && (ENTITY_TYPE_COLORS as readonly string[]).includes(value)
}
