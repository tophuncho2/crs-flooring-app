// Work-orders FE module barrel — the table row-rendering primitives consumed by
// both the work-orders list view and the contact record view's Statistics
// section. Mirrors the adjustments module barrel (`modules/adjustments/index.ts`):
// hosts import the shared columns + cell renderer + row-actions menu from here,
// never by deep path.
export { WORK_ORDERS_LIST_COLUMNS } from "./components/list/table/work-orders-list-columns"
export { renderWorkOrderRowCell } from "./components/list/table/work-orders-row-cell"
export { renderWorkOrderRowActions } from "./components/list/table/work-order-row-actions"
