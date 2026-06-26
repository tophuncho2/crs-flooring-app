// Anchors the genuinely-coloured semantic tones to a palette colour so the
// bordered-chip badge surfaces draw their Tailwind tokens from the ONE palette
// source (`PALETTE_CLASS_NAME`) instead of re-keying emerald/amber/rose/blue in
// every badge. This normalizes the *color values* only — the semantic tones keep
// their own code-meaning; the palette stays meaning-free (see color-palette.ts).
//
// `default` and `muted` are structural neutrals, not real colors — they carry no
// palette colour. `muted` is a shared constant; `default` is the one per-surface
// variant (badge dims its text, chip does not) so the caller passes it in.

import type { BadgeTone } from "./badge-tone"
import { PALETTE_CLASS_NAME, type PaletteColor } from "./color-palette"

export const TONE_PALETTE: Record<"success" | "warning" | "error" | "processing", PaletteColor> = {
  success: "GREEN",
  warning: "AMBER",
  error: "ROSE",
  processing: "BLUE",
}

// Shared neutral muted chip (identical across badge surfaces today).
export const TONE_MUTED_CHIP_CLASS_NAME = "border-stone-300/45 bg-stone-200/30 text-stone-700"

/**
 * Resolve a chip-shaped className for a semantic `tone`. Colored tones derive
 * from the palette anchor; `muted` is the shared neutral; `default` is the only
 * per-surface variant, so each badge passes its own `defaultClassName`.
 */
export function toneChipClassName(tone: BadgeTone, defaultClassName: string): string {
  if (tone === "default") return defaultClassName
  if (tone === "muted") return TONE_MUTED_CHIP_CLASS_NAME
  return PALETTE_CLASS_NAME[TONE_PALETTE[tone]]
}
