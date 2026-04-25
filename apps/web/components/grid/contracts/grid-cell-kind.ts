// First-class enum of cell kinds the grid can render. Consumers reference
// these in column specs; cell renderers register themselves against a kind.
//
// The DEFAULT_ALIGN map captures the alignment a cell of each kind should
// usually receive when the column spec omits an explicit `align`. It is NOT
// auto-applied by the grid — the consumer or a higher-level helper applies it
// so primitives stay pure.

export type GridCellKind =
  | "text"
  | "number"
  | "quantity"
  | "currency"
  | "per-unit"
  | "select"
  | "dropdown"
  | "status"
  | "checkbox"
  | "actions"

export type CellAlign = "start" | "center" | "end"

export const GRID_CELL_KIND_ALIGN_DEFAULT: Record<GridCellKind, CellAlign> = {
  text: "start",
  number: "end",
  quantity: "center",
  currency: "end",
  "per-unit": "end",
  select: "start",
  dropdown: "start",
  status: "center",
  checkbox: "center",
  actions: "center",
}
