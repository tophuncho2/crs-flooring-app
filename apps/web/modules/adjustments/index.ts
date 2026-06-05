// Peer-level adjustment FE module — a pure primitives library, consumed by
// both `apps/web/modules/work-orders/` and `apps/web/modules/inventory/`.
// Houses the scope-aware edit controller (state machine) + its form fields,
// picker stack, and picker takeovers + the scope-aware mutation client + the
// row-rendering primitives (cell renderer, column definitions, timestamp
// formatter). It owns NO record-view composition — the record-view embedded
// adjustment view lives in `modules/inventory` (adjustments only ever appear in
// a record view as the inventory record view's second section, which the
// work-orders material-items section reuses).
export { AdjustmentEditPanel } from "./components/adjustment-edit-panel"
export type { AdjustmentEditPanelProps } from "./components/adjustment-edit-panel"
export { AdjustmentEditFormFields } from "./components/adjustment-edit-panel/adjustment-edit-form-fields"
export type { AdjustmentEditFormFieldsProps } from "./components/adjustment-edit-panel/adjustment-edit-form-fields"
export { AdjustmentPickerStack } from "./components/adjustment-edit-panel/adjustment-picker-stack"
export { AdjustmentPickerTakeoverBody } from "./components/adjustment-edit-panel/adjustment-picker-takeover-body"
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
  WO_CREATE_PICKER_CONFIG,
  HUB_CREATE_PICKER_CONFIG,
  EDIT_PICKER_CONFIG,
  type AdjustmentEditPanelController,
  type AdjustmentEditPanelOpenSpec,
  type AdjustmentEditPanelMode,
  type AdjustmentPanelPatch,
  type AdjustmentPanelPickerKind,
  type AdjustmentPanelRow,
  type AdjustmentPickerConfig,
  type AdjustmentCreateSeed,
} from "./controllers/adjustment-side-panel"
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
