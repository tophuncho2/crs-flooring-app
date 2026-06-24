// Shared non-semantic palette value object: the canonical NON-semantic color set
// used as a user-assigned visual tag across modules (entity types, work orders, …).
// Meaningless in code — purely a visual tag. This is the persistence/validation
// source of truth; the matching Prisma enum is `PaletteColor`, and the UI class/
// label maps are the data-driven sibling at
// apps/web/engines/common/badges/contracts/color-palette.ts (which sources its
// values + type from here). Pure data, no I/O.

export const PALETTE_COLOR_VALUES = [
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

export type PaletteColor = (typeof PALETTE_COLOR_VALUES)[number]

export const DEFAULT_PALETTE_COLOR: PaletteColor = "SLATE"

export function isPaletteColor(value: unknown): value is PaletteColor {
  return typeof value === "string" && (PALETTE_COLOR_VALUES as readonly string[]).includes(value)
}

export const PALETTE_COLOR_INVALID_MESSAGE = "Color is invalid"
