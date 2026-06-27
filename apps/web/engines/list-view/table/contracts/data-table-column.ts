import type { ReactNode } from "react"

export type DataTableCellAlign = "start" | "center" | "end"

/**
 * Column contract for the native-`<table>` DataTable. Intentionally
 * smaller than `GridColumn`:
 *   - No `minWidth` / `preferredWidth` / `grow`. The browser's
 *     `table-layout: auto` algorithm sizes each track to
 *     `max(header label, widest cell)` and never wraps (cells carry
 *     `white-space: nowrap`).
 *   - No `kind`. Per-kind styling lives in the consumer's `renderCell`.
 */
export type DataTableColumn<TRow> = {
  key: string
  label: string
  align?: DataTableCellAlign
  /**
   * @deprecated INERT — the clickable header sort affordance was removed.
   * Sorting is driven by the toolbar's multi-column Sort menu, not the column
   * header. This flag no longer renders a caret or makes the header clickable;
   * retained only for source compat and slated for removal. Off by default.
   */
  sortable?: boolean
  /**
   * Optional per-column renderer. Receives the row and returns the cell
   * body. If omitted, the table renders `row[column.key]` as plain
   * text.
   */
  render?: (row: TRow) => ReactNode
}
