import type {
  FlooringInventoryAdjustmentType,
  InventoryAdjustmentRow,
} from "@builders/domain"

/**
 * Editable form values for the adjustment side panel. `inventoryId` is editable
 * only in create mode; saved rows treat it as immutable. The `workOrderId` /
 * `workOrderItemId` pair is editable in edit mode on any non-voided,
 * non-queued row (the adjustment relink path — independent from the
 * pending-editable rule that locks `cut` / `notes` / `isWaste`).
 *
 * `adjustmentType` (INCREASE | DEDUCTION) is direction. It is chosen only in
 * the manual create flow (inventory hub); WO-linked cuts are always DEDUCTION
 * and saved rows treat direction as immutable.
 */
export type AdjustmentEditForm = {
  inventoryId: string
  /**
   * The warehouse selected in the form as an inventory filter. The persisted
   * adjustment warehouse is always the chosen inventory's; this drives the
   * inventory + location pickers and the WO-relink scope. Immutable on edit.
   */
  warehouseId: string | null
  adjustmentType: FlooringInventoryAdjustmentType
  quantity: string
  isWaste: boolean
  notes: string
  workOrderId: string | null
  workOrderItemId: string | null
}

/**
 * UI-only narrowing filter (free-text location) plus snapshot labels for
 * the picker triggers. None of these ship to the adjustment API — the
 * persisted row carries only `inventoryId` / `workOrderId` /
 * `workOrderItemId`. Local state lives outside `AdjustmentEditForm` so the
 * dirty check + mutation payload stay clean.
 *
 * `pickedWorkOrderLabel` / `pickedWorkOrderItemLabel` keep the relink
 * pickers' triggers in sync with `form.workOrderId` / `workOrderItemId`
 * after the user picks a new option — otherwise the triggers would stay
 * pinned to the original adjustment's labels.
 */
export type AdjustmentPanelLocal = {
  locationFilter: string
  pickedWarehouseLabel: string
  pickedInventoryLabel: string
  pickedInventoryStockUnitAbbrev: string
  pickedWorkOrderLabel: string
  pickedWorkOrderItemLabel: string
  pickedWorkOrderItemNotes: string
}

/**
 * Per-context picker visibility/lock state for the shared sticky-header picker
 * stack. `hidden` skips the trigger; `locked` renders a disabled trigger
 * showing its seeded value; `editable` opens a body-takeover picker. The
 * material-item display is derived (read-only whenever a WO is linked), so it
 * has no entry here.
 */
export type PickerState = "hidden" | "locked" | "editable"
export type AdjustmentPickerConfig = {
  workOrder: PickerState
  warehouse: PickerState
  inventory: PickerState
  location: PickerState
}

/**
 * Seed values for a create open-spec. Every field is optional; the controller
 * builds the initial form + picker-trigger labels from whatever the host
 * provides. `productId` fixes the inventory product (the inventory picker is
 * product-filtered, so all selectable inventory shares it) and scopes the
 * WO-relink picker + WOMI auto-resolve.
 */
export type AdjustmentCreateSeed = {
  inventoryId?: string
  warehouseId?: string | null
  workOrderId?: string | null
  workOrderItemId?: string | null
  productId?: string
  inventoryLabel?: string
  warehouseLabel?: string
  locationLabel?: string
  workOrderLabel?: string
  materialItemLabel?: string
  materialItemNotes?: string
  stockUnitAbbrev?: string | null
}

/**
 * Local "patch" emitted to the parent when a adjustment mutation completes.
 * Parents apply the patch to their adjustment snapshot (per-WOMI map on the
 * WO side, flat array on the inv side) to keep the section in sync
 * without a refetch.
 *
 * `workOrderItemId` is carried so the WO-side parent can route the patch
 * into the right WOMI bucket. The inv-side parent ignores it (its
 * snapshot is keyed by adjustment id).
 *
 * A `delete` carries a `reason`: `"removed"` is a genuine row deletion;
 * `"relink-move"` is the bucket-move half of a relink (delete-from-old +
 * upsert-into-new) and only matters to the WO-side per-WOMI snapshot. The
 * inv-side keeps the row (its `inventoryId` is unchanged), so it pops the
 * panel only on `"removed"`.
 */
export type AdjustmentPanelPatch =
  | { kind: "upsert"; workOrderItemId: string | null; adjustment: InventoryAdjustmentRow }
  | {
      kind: "delete"
      reason: "removed" | "relink-move"
      workOrderItemId: string | null
      adjustmentId: string
    }

export type AdjustmentEditPanelMode = "create" | "edit"

/**
 * Row shape the panel renders in edit mode. Widens `InventoryAdjustmentRow` with the
 * server-resolved labels the inventory record view already surfaces on
 * `EnrichedInventoryAdjustmentRow` (`workOrderNumber`, `workOrderItemProductLabel`,
 * `warehouseName`). Optional because mutation responses come back as plain
 * `InventoryAdjustmentRow` — callers (and the update-mutation handler) carry labels
 * forward from the prior snapshot.
 */
export type AdjustmentPanelRow = InventoryAdjustmentRow & {
  workOrderNumber?: string | null
  workOrderItemProductLabel?: string | null
  workOrderItemNotes?: string | null
  warehouseName?: string | null
}

/**
 * Open spec for the shared adjustment panel. One `create` shape (the host
 * supplies a `pickerConfig` describing which pickers are editable/locked and a
 * `seed` of prefill values) and one `edit` shape. Both surfaces — the WO record
 * view and the inventory hub — open the panel with the same union; only the
 * config + seed differ per context.
 */
export type AdjustmentEditPanelOpenSpec =
  | {
      mode: "create"
      pickerConfig: AdjustmentPickerConfig
      seed: AdjustmentCreateSeed
    }
  | {
      mode: "edit"
      pickerConfig: AdjustmentPickerConfig
      workOrderItemId: string | null
      adjustment: AdjustmentPanelRow
    }
