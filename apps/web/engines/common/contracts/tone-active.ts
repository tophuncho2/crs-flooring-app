// Selected-segment fill per tone — a touch stronger than the bordered chip so
// the chosen option reads as "filled". The container owns the border; each
// button sets background + text only. Shared by `SegmentedChoiceCell`
// (record-view) and `SegmentedDropdown` (picker) so both read one source.
//
// NOTE: still hand-keyed. Enum-driving this active-segment shape from the palette
// needs `PALETTE_CLASS_NAME` decomposed into per-color {border,bg,text} tokens
// (the chip string can't be reused at /15 strength) — deferred to its own pass.

import type { CellTone } from "./cell-tone"

export const TONE_ACTIVE_CLASS_NAME: Record<CellTone, string> = {
  default: "bg-[var(--foreground)]/10 text-[var(--foreground)]",
  success: "bg-emerald-500/15 text-emerald-700",
  warning: "bg-amber-500/20 text-amber-800",
  error: "bg-rose-500/15 text-rose-800",
  processing: "bg-blue-500/15 text-blue-800",
  muted: "bg-stone-200/50 text-stone-700",
}
