"use client"

import type { ReactNode } from "react"
import type { BadgeTone } from "./contracts/badge-tone"
import { PALETTE_CLASS_NAME, type PaletteColor } from "./contracts/color-palette"
import { toneChipClassName } from "./contracts/tone-palette"

// Per-surface `default` badge (dimmed status text). Colored/muted tones come from
// the shared palette-anchored derivation (`toneChipClassName`).
const DEFAULT_TONE_CLASS_NAME = "border-[var(--panel-border)] bg-transparent text-[var(--foreground)]/75"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type BadgeSize = "sm" | "md"

const SIZE_CLASS_NAME: Record<BadgeSize, string> = {
  sm: "px-2.5 py-1 text-[10px]",
  md: "px-3 py-1.5 text-xs",
}

export function StatusBadge({
  children,
  tone = "default",
  paletteColor,
  size = "sm",
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  // Optional NON-semantic palette color. When set it overrides the `tone` path
  // and pulls its className from the palette map (mirrors `CellChip`); when
  // absent the `tone` behavior is unchanged.
  paletteColor?: PaletteColor
  size?: BadgeSize
  className?: string
}) {
  return (
    <span
      className={joinClassNames(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full border font-semibold uppercase tracking-[0.12em]",
        SIZE_CLASS_NAME[size],
        paletteColor ? PALETTE_CLASS_NAME[paletteColor] : toneChipClassName(tone, DEFAULT_TONE_CLASS_NAME),
        className,
      )}
    >
      {children}
    </span>
  )
}
