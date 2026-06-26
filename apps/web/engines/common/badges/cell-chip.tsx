"use client"

import type { ReactNode } from "react"
import type { BadgeTone } from "./contracts/badge-tone"
import { PALETTE_CLASS_NAME, type PaletteColor } from "./contracts/color-palette"
import { toneChipClassName } from "./contracts/tone-palette"

// Square-cornered sibling of `StatusBadge`: a tone-driven *value* cell — the
// bordered, tinted rectangle a table value sits inside (Airtable linked-cell
// feel). Shares the `CellTone` vocabulary and the badge tone surface, but renders
// rounded-md, tabular-nums, mixed-case (a value, not an uppercase status label).
// Future clickable linked columns compose this with `RecordOpenButton`.

// Per-surface `default` chip (full-opacity value text). Colored/muted tones come
// from the shared palette-anchored derivation (`toneChipClassName`).
const DEFAULT_CHIP_CLASS_NAME = "border-[var(--panel-border)] bg-transparent text-[var(--foreground)]"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export function CellChip({
  children,
  tone = "default",
  paletteColor,
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  // Optional NON-semantic palette color. When set it overrides the `tone` path
  // and pulls its className from the palette map; when absent the `tone`
  // behavior is unchanged (the semantic ledger chips keep working).
  paletteColor?: PaletteColor
  className?: string
}) {
  return (
    <span
      className={joinClassNames(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md border px-2 py-0.5 text-sm font-medium tabular-nums",
        paletteColor ? PALETTE_CLASS_NAME[paletteColor] : toneChipClassName(tone, DEFAULT_CHIP_CLASS_NAME),
        className,
      )}
    >
      {children}
    </span>
  )
}
