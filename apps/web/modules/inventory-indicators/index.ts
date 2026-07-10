// Inventory-indicators FE module. Houses the standalone list view + the row
// primitives shared with the products record-view section (the colored status
// chip, column defs, cell renderer) + the post-mutation reconcile. The record-view
// section composition (edit face, create modal, controllers) lives in
// `modules/products` — the parent record it drills into — mirroring how the
// adjustments composition lives in `modules/inventory`.
export { IndicatorStatusChip } from "./components/status/indicator-status-chip"
export {
  INDICATORS_LIST_COLUMNS,
  INDICATORS_SORT_OPTIONS,
  INDICATORS_ALLOWED_SORT_FIELDS,
  INDICATORS_MAX_SORT_LEVELS,
} from "./components/list/table/inventory-indicators-list-columns"
export { renderIndicatorsRowCell } from "./components/list/table/inventory-indicators-row-cell"
export { useIndicatorReconcile } from "./controllers/use-indicator-reconcile"
