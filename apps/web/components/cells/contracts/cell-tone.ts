// Tone vocabulary shared across cells, badges, and any other primitive that
// surfaces a coloured semantic indicator. Single source of truth so consumers
// don't reinvent palette names.

export type CellTone = "default" | "success" | "warning" | "error" | "processing" | "muted"

export const CELL_TONE_VALUES: ReadonlyArray<CellTone> = [
  "default",
  "success",
  "warning",
  "error",
  "processing",
  "muted",
] as const
