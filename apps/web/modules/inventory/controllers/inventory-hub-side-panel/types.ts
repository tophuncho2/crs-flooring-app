import type { InventoryForm } from "@builders/domain"

export type {
  InventoryDetail,
  InventoryForm,
  InventoryRow,
  InventoryCutLogRow,
} from "@builders/domain"

/**
 * Mode state for the inventory hub side panel. The hub mirrors the property
 * hub's section-edit / view pattern, parameterized for inventory:
 *
 *   - closed: panel not visible
 *   - view: read-only inventory cells card on top, paginated cut-logs list
 *           below; clicking the cells card transitions to
 *           `section-edit-inventory`, clicking a cut-log row transitions
 *           to `section-edit-cut-log`
 *   - section-edit-inventory: editable inventory cells with the canonical
 *           three editable fields (archive / location / internalNotes);
 *           the other identity fields stay UI-blocked per the record view
 *   - section-edit-cut-log: cut-log edit fields (cut / isWaste / notes);
 *           no inventory picker — parent inventory is the hub context
 *           and is immutable after cut-log create on every cut-log edit
 *           surface
 *
 * The owning inventoryId is carried on every non-closed mode so query
 * caches reset cleanly when the hub re-opens for a different inventory.
 */
export type HubMode =
  | { kind: "closed" }
  | { kind: "view"; inventoryId: string }
  | { kind: "section-edit-inventory"; inventoryId: string }
  | {
      kind: "section-edit-cut-log"
      inventoryId: string
      cutLogId: string
    }

export type InventoryEditState = {
  form: InventoryForm
  baseline: InventoryForm
  updatedAt: string | null
}
