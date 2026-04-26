// Geometry for the positioned-cell grid (the "invisible grid" used for
// field/main sections). Differs from the streaming Grid's column spec — the
// LayoutGrid is a column count + row mode + chrome flag; cells inside place
// themselves via `(col, row, colSpan, rowSpan)` (see ./cell-placement).

export type LayoutGridChrome = "invisible" | "visible"

/** Canonical maximum column count for field sections — 8. */
export const FIELD_SECTION_COLUMNS = 8 as const

export type LayoutGridGeometry = {
  /** Number of columns in the grid. Field sections cap at 8. */
  columns: number
  /**
   * Number of rows. `"auto"` (default) means the grid lays out as many rows
   * as needed to fit the placed cells — sections "flex to fit". An explicit
   * number locks the row count.
   */
  rows?: number | "auto"
  /** Gap between cells, in CSS length units. Default `"1rem"`. */
  gap?: number | string
  /**
   * Chrome controls whether borders / background / padding render. Default
   * `"invisible"` — field/main sections render with zero visible chrome so
   * the placed cells carry the section's visual weight on their own.
   */
  chrome?: LayoutGridChrome
}
