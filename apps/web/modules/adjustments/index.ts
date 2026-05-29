// Peer-level adjustment FE module. Consumed by both
// `apps/web/modules/work-orders/` and `apps/web/modules/inventory/`
// record views. Houses the canonical edit-panel UI + controller hook
// + the scope-aware mutation client + the row-rendering primitives
// (cell renderer, column definitions, timestamp formatter). Adjustments
// are created only from the work-orders side (always grouped under a
// WOMI in the UI); the shared panel's `canCreate` flag gates that path.
export { AdjustmentEditPanel } from "./components/adjustment-edit-panel"
export type { AdjustmentEditPanelProps } from "./components/adjustment-edit-panel"
export {
  ADJUSTMENT_COLUMN_DEFINITIONS,
  INVENTORY_ADJUSTMENT_LAYOUT,
  formatAdjustmentTimestamp,
  renderAdjustmentReadOnlyCell,
  renderAdjustmentStatusControl,
  type AdjustmentReadOnlyRenderOptions,
} from "./components/row"
export {
  useAdjustmentEditPanel,
  type AdjustmentCreatePresetInventory,
  type AdjustmentEditPanelController,
  type AdjustmentEditPanelOpenSpec,
  type AdjustmentEditPanelMode,
  type AdjustmentPanelPatch,
  type AdjustmentPanelRow,
} from "./controllers/adjustment-side-panel"
export {
  createPendingAdjustmentRequest,
  updatePendingAdjustmentRequest,
  deletePendingAdjustmentRequest,
  finalizeAdjustmentRequest,
  type AdjustmentScopeUrl,
  type PendingAdjustmentMutationResponse,
  type DeletePendingAdjustmentResponse,
  type FinalizeAdjustmentResponse,
} from "./data/mutations"
