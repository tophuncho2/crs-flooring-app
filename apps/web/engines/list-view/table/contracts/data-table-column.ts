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
   * When true, the header renders as a sort button (caret affordance) and
   * clicking it calls `DataTableProps.onSort(column.key)`. Inert unless the
   * table is also given an `onSort` handler. The caller maps the column key to
   * a server sort field + direction. Off by default.
   */
  sortable?: boolean
  /**
   * Optional per-column renderer. Receives the row and returns the cell
   * body. If omitted, the table renders `row[column.key]` as plain
   * text.
   */
  render?: (row: TRow) => ReactNode
}
