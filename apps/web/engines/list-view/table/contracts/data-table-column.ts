import type { ReactNode } from "react"

export type DataTableCellAlign = "start" | "center" | "end"

/**
 * Column contract for the native-`<table>` DataTable. Intentionally
 * smaller than `GridColumn`:
 *   - No `kind`. Per-kind styling lives in the consumer's `renderCell`.
 *   - The sizing hints (`minWidth` / `width` / `grow`) are consulted **only**
 *     by the `editable` table variant, which lays columns out with
 *     `table-layout: fixed` + a `<colgroup>`. The default `list` variant
 *     ignores them entirely: the browser's `table-layout: auto` algorithm
 *     sizes each track to `max(header label, widest cell)` and never wraps
 *     (cells carry `white-space: nowrap`).
 */
export type DataTableColumn<TRow> = {
  key: string
  label: string
  align?: DataTableCellAlign
  /**
   * Minimum track width (px number or CSS length). Editable variant only —
   * floors a growable column so inline editors don't collapse.
   */
  minWidth?: number | string
  /**
   * Fixed track width (px number or CSS length). Editable variant only —
   * pins a column (e.g. a numeric field) so it never grows.
   */
  width?: number | string
  /**
   * Flex-grow weight for the editable variant. Columns with `grow > 0` split
   * the leftover width proportionally; omitted/`0` columns stay at `width` /
   * `minWidth`. Mirrors `GridColumn.grow`.
   */
  grow?: number
  /**
   * Optional per-column renderer. Receives the row and returns the cell
   * body. If omitted, the table renders `row[column.key]` as plain
   * text.
   */
  render?: (row: TRow) => ReactNode
}
