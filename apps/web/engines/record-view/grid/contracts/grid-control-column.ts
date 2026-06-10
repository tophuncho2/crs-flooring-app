// Fixed-width control column spec. Control columns flow into the grid
// template alongside data columns but never grow — they hold consumer-defined
// content (selection checkboxes, expand toggles, action buttons, open-row
// links).
//
// `kind` is a hint for renderers / consumer logic; the grid itself does not
// branch on it. Consumer renders the cell content via `Grid`'s `renderControl`
// slot.

import type { CellAlign } from "./grid-cell-kind"

export type GridControlKind =
  | "selection"
  | "expand"
  | "actions"
  | "open"
  | "void"
  | "commit"

export type GridControlColumn = {
  key: string
  kind: GridControlKind
  /** Fixed pixel width (number) or CSS length (string). Control columns do not grow. */
  width: number | string
  align?: CellAlign
  label?: string
}
