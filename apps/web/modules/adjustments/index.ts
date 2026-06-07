// Peer-level adjustment FE module — a pure primitives library, consumed by
// both `apps/web/modules/work-orders/` and `apps/web/modules/inventory/`.
// Houses the row-rendering primitives (cell renderer, column definitions,
// timestamp formatter) + the scope-aware mutation client. It owns NO record-view
// composition and no edit state machine — the adjustment record-view (edit
// controller, form fields, picker stack) lives in `modules/inventory`
// (adjustments only ever appear in a record view as the inventory record view's
// second section, which the work-orders material-items section reuses).
export {
  ADJUSTMENT_COLUMN_DEFINITIONS,
  INVENTORY_ADJUSTMENT_LAYOUT,
  formatAdjustmentTimestamp,
  renderAdjustmentReadOnlyCell,
  renderAdjustmentStatusControl,
  type AdjustmentReadOnlyRenderOptions,
} from "./components/row"
export {
  createAdjustmentRequest,
  updatePendingAdjustmentRequest,
  deletePendingAdjustmentRequest,
  finalizeAdjustmentRequest,
  type AdjustmentScopeUrl,
  type PendingAdjustmentMutationResponse,
  type DeletePendingAdjustmentResponse,
  type FinalizeAdjustmentResponse,
} from "./data/mutations"
