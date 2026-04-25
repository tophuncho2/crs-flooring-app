import type { ReactNode } from "react"
import type { CellAlign, GridCellKind } from "./grid-cell-kind"

// Universal column contract for both list-view and record-view consumption.
// The grid renderer respects `minWidth` + `grow` for layout; `kind` lets
// helpers infer defaults; `editable`/`defaultHidden`/`groupable`/`sortable`
// are pure metadata the consumer + feature layers read.
//
// The optional `render` lets a column produce arbitrary content per row
// without coupling the grid to specific cell components — the consumer wires
// in whichever cell primitive (text, currency, dropdown, etc.) it wants.

export type GridColumn<TRow> = {
  key: string
  label: string
  kind?: GridCellKind
  minWidth: number | string
  preferredWidth?: number | string
  grow?: number
  align?: CellAlign
  editable?: boolean
  defaultHidden?: boolean
  groupable?: boolean
  sortable?: boolean
  /**
   * Pure renderer — receives the row, returns the ReactNode the grid drops
   * into the cell shell. If omitted, the grid renders the row's value at
   * `column.key` as plain text (best effort).
   */
  render?: (row: TRow) => ReactNode
  /**
   * For sortable columns: extract a comparable value the sort feature can
   * order by.
   */
  sortValue?: (row: TRow) => string | number
  /**
   * For groupable columns: extract the group key the group feature buckets by.
   */
  groupValue?: (row: TRow) => string
}
