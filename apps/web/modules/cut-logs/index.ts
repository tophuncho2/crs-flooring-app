// Peer-level cut-log FE module. Consumed by both
// `apps/web/modules/work-orders/` and `apps/web/modules/inventory/`
// record views. Houses the canonical edit-panel UI + controller hook
// + the scope-aware mutation client + the row-rendering primitives
// (cell renderer, column definitions, timestamp formatter). Cut logs
// are created only from the work-orders side (always grouped under a
// WOMI in the UI); the shared panel's `canCreate` flag gates that path.
export { CutLogEditPanel } from "./components/cut-log-edit-panel"
export type { CutLogEditPanelProps } from "./components/cut-log-edit-panel"
export {
  CUT_LOG_COLUMN_DEFINITIONS,
  INVENTORY_CUT_LOG_LAYOUT,
  formatCutLogTimestamp,
  renderCutLogReadOnlyCell,
  renderCutLogStatusControl,
  type CutLogReadOnlyRenderOptions,
} from "./components/row"
export {
  useCutLogEditPanel,
  type CutLogCreatePresetInventory,
  type CutLogEditPanelController,
  type CutLogEditPanelOpenSpec,
  type CutLogEditPanelMode,
  type CutLogPanelPatch,
  type CutLogPanelRow,
} from "./controllers/use-cut-log-edit-panel"
export {
  createPendingCutLogRequest,
  updatePendingCutLogRequest,
  deletePendingCutLogRequest,
  voidCutLogRequest,
  finalizeCutLogRequest,
  type CutLogScopeUrl,
  type PendingCutLogMutationResponse,
  type DeletePendingCutLogResponse,
  type FinalizeCutLogResponse,
} from "./data/mutations"
