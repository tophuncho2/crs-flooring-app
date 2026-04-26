// Per-cell placement within a LayoutGrid. `col` is required (1-indexed);
// `row` is optional — omit to auto-flow into the next available row. `colSpan`
// + `rowSpan` default to 1.

export type CellPlacement = {
  /** 1-indexed column. Required. */
  col: number
  /** 1-indexed row. Optional — omit to auto-flow into the next available row. */
  row?: number
  /** Number of columns this cell spans. Default 1. */
  colSpan?: number
  /** Number of rows this cell spans. Default 1. */
  rowSpan?: number
}
