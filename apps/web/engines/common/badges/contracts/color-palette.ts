// Non-semantic palette: plain colors with NO meaning in code (unlike the
// semantic `CellTone` vocabulary — success/warning/error…). A user picks a color
// purely as a visual tag. The color SET + type are the SHARED domain value object
// (packages/domain/src/shared/palette.ts, Prisma enum `PaletteColor`); this file
// is the PRESENTATION sibling — the Tailwind class + display label per color —
// and re-exports the domain values/type so engine consumers have one import.
//
// The "plain colors, no meaning" rule is about USER-FACING meaning: when a user
// tags a row a color, the client company decides what it signifies — code assigns
// none. That still holds even though the semantic chip badges now SOURCE their
// Tailwind tokens from this map (via `tone-palette.ts`): the semantic tones keep
// their own code-meaning; we only normalize the raw color *values* so they stop
// duplicating/drifting. Picking a palette color here never confers meaning.

import { PALETTE_COLOR_VALUES, type PaletteColor } from "@builders/domain"

export { PALETTE_COLOR_VALUES }
export type { PaletteColor }

// Chip className per palette color — bordered, tinted, same shape language as
// the `CellChip` tone classes (border-/35, bg-/10, text-/700) but keyed by the
// non-semantic palette value.
export const PALETTE_CLASS_NAME: Record<PaletteColor, string> = {
  SLATE: "border-slate-500/35 bg-slate-500/10 text-slate-700",
  RED: "border-red-500/35 bg-red-500/10 text-red-700",
  AMBER: "border-amber-500/35 bg-amber-500/10 text-amber-800",
  ORANGE: "border-orange-500/35 bg-orange-500/10 text-orange-700",
  LIME: "border-lime-500/35 bg-lime-500/10 text-lime-700",
  GREEN: "border-green-500/35 bg-green-500/10 text-green-700",
  TEAL: "border-teal-500/35 bg-teal-500/10 text-teal-700",
  CYAN: "border-cyan-500/35 bg-cyan-500/10 text-cyan-700",
  BLUE: "border-blue-500/35 bg-blue-500/10 text-blue-700",
  VIOLET: "border-violet-500/35 bg-violet-500/10 text-violet-700",
  PINK: "border-pink-500/35 bg-pink-500/10 text-pink-700",
  ROSE: "border-rose-500/35 bg-rose-500/10 text-rose-700",
}

// Title-case display label for pickers/legends.
export const PALETTE_LABEL: Record<PaletteColor, string> = {
  SLATE: "Slate",
  RED: "Red",
  AMBER: "Amber",
  ORANGE: "Orange",
  LIME: "Lime",
  GREEN: "Green",
  TEAL: "Teal",
  CYAN: "Cyan",
  BLUE: "Blue",
  VIOLET: "Violet",
  PINK: "Pink",
  ROSE: "Rose",
}
