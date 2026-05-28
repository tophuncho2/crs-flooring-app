import type { InventoryForm } from "@builders/domain"

export type {
  InventoryDetail,
  InventoryForm,
  InventoryRow,
  EnrichedInventoryAdjustmentRow,
} from "@builders/domain"

// Only the work-order relink picker remains. The material item is auto-linked
// from the selected work order (deterministic per WO + product) and rendered
// read-only, so there is no material-item picker takeover.
export type CutLogPickerKind = "workOrder"

/**
 * Mode state for the inventory hub side panel. The hub mirrors the property
 * hub's section-edit / view / picker-takeover pattern, parameterized for
 * inventory:
 *
 *   - closed: panel not visible
 *   - view: read-only inventory cells card on top, paginated cut-logs list
 *           below; clicking the cells card transitions to
 *           `section-edit-inventory`, clicking a cut-log row transitions
 *           to `section-edit-cut-log`
 *   - section-edit-inventory: editable inventory cells with the canonical
 *           three editable fields (archive / location / internalNotes);
 *           the other identity fields stay UI-blocked per the record view
 *   - section-duplicate-inventory: clone the current row into a brand-new
 *           one. Five editable cells (roll# / note / starting stock /
 *           location / internal notes); the rest is pasted from the source
 *           and shown read-only. Save creates the row + jumps to view it.
 *   - section-edit-cut-log: cut-log edit fields (cut / isWaste / notes);
 *           no inventory picker — parent inventory is the hub context
 *           and is immutable after cut-log create on every cut-log edit
 *           surface. The sticky topToolbar carries the WO relink trigger;
 *           clicking it enters `picker-takeover`. The material item is a
 *           read-only label auto-linked from the chosen WO.
 *   - picker-takeover: body swap to the work-order `HubSidePanelPicker`.
 *           `returnTo` snapshots the previous mode so close / commit can
 *           pop back without re-deriving it. Only entered from
 *           `section-edit-cut-log` today, but `returnTo: HubMode` keeps
 *           the union open to future surfaces.
 *
 * The owning inventoryId is carried on every non-closed non-picker mode
 * so query caches reset cleanly when the hub re-opens for a different
 * inventory. Picker-takeover reads its inventoryId from `returnTo`.
 */
export type HubMode =
  | { kind: "closed" }
  | { kind: "view"; inventoryId: string }
  | { kind: "section-edit-inventory"; inventoryId: string }
  | { kind: "section-duplicate-inventory"; inventoryId: string }
  | {
      kind: "section-edit-cut-log"
      inventoryId: string
      cutLogId: string
    }
  | {
      kind: "picker-takeover"
      returnTo: HubMode
      pickerKind: CutLogPickerKind
    }

export type InventoryEditState = {
  form: InventoryForm
  baseline: InventoryForm
  updatedAt: string | null
}
