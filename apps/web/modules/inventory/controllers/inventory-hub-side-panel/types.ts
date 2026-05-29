import type { InventoryForm } from "@builders/domain"

export type {
  InventoryDetail,
  InventoryForm,
  InventoryRow,
  EnrichedInventoryAdjustmentRow,
} from "@builders/domain"

/**
 * Mode state for the inventory hub side panel. The hub mirrors the property
 * hub's section-edit / view pattern, parameterized for inventory:
 *
 *   - closed: panel not visible
 *   - view: read-only inventory cells card on top, paginated adjustments list
 *           below; clicking the cells card transitions to
 *           `section-edit-inventory`, clicking a adjustment row transitions
 *           to `section-edit-adjustment`
 *   - section-edit-inventory: editable inventory cells with the canonical
 *           three editable fields (archive / location / internalNotes);
 *           the other identity fields stay UI-blocked per the record view
 *   - section-duplicate-inventory: clone the current row into a brand-new
 *           one. Five editable cells (roll# / note / starting stock /
 *           location / internal notes); the rest is pasted from the source
 *           and shown read-only. Save creates the row + jumps to view it.
 *   - section-edit-adjustment / section-create-adjustment: the shared
 *           adjustment panel (picker stack in the sticky header + editable
 *           cells in the body). Picker takeovers are owned by the embedded
 *           adjustment controller (`adjustmentPanel.pickerKind`), not a hub
 *           mode — the hub body swaps to the takeover when that is non-null.
 *
 * The owning inventoryId is carried on every non-closed mode so query caches
 * reset cleanly when the hub re-opens for a different inventory.
 */
export type HubMode =
  | { kind: "closed" }
  | { kind: "view"; inventoryId: string }
  | { kind: "section-edit-inventory"; inventoryId: string }
  | { kind: "section-duplicate-inventory"; inventoryId: string }
  | {
      kind: "section-edit-adjustment"
      inventoryId: string
      adjustmentId: string
    }
  | {
      kind: "section-create-adjustment"
      inventoryId: string
    }

export type InventoryEditState = {
  form: InventoryForm
  baseline: InventoryForm
  updatedAt: string | null
}
