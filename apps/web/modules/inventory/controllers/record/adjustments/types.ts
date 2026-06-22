import type {
  FlooringInventoryAdjustmentType,
  InventoryAdjustmentRow,
} from "@builders/domain"

/**
 * Editable form values for the adjustment edit form. `inventoryId` is editable
 * only in create mode; saved rows treat it as immutable. Every other field —
 * `quantity`, the metadata trio (`location` / `notes` / `isWaste`), and the
 * `workOrderId` relink — is freely editable for the row's whole lifecycle;
 * there is no finalize/freeze.
 *
 * `adjustmentType` (INCREASE | DEDUCTION) is direction. It is freely editable
 * for the row's whole lifecycle in both the manual create flow and on saved
 * rows; flipping it re-flows the inventory's netDeducted + before/after chain.
 *
 * `workOrderId` links the adjustment to a work order (any product, any
 * direction) — it no longer carries a material-item link.
 */
export type AdjustmentEditForm = {
  inventoryId: string
  /**
   * The warehouse selected in the form as an inventory filter. The persisted
   * adjustment warehouse is always the chosen inventory's; this drives the
   * inventory + location pickers. Immutable on edit.
   */
  warehouseId: string | null
  adjustmentType: FlooringInventoryAdjustmentType
  quantity: string
  isWaste: boolean
  notes: string
  /**
   * Seeded from the parent inventory's location on create and locked (read-only)
   * while the form is in create mode. Once the row exists it is user-owned free
   * text, fully editable for the rest of its lifecycle.
   */
  location: string
  workOrderId: string | null
}

/**
 * UI-only narrowing filter (free-text location) plus snapshot labels for
 * the picker triggers. None of these ship to the adjustment API — the
 * persisted row carries only `inventoryId` / `workOrderId`. Local state lives
 * outside `AdjustmentEditForm` so the dirty check + mutation payload stay clean.
 *
 * `pickedWorkOrderLabel` keeps the relink picker's trigger in sync with
 * `form.workOrderId` after the user picks a new option — otherwise the trigger
 * would stay pinned to the original adjustment's label.
 */
export type AdjustmentEditLocal = {
  locationFilter: string
  pickedWarehouseLabel: string
  /** Per-column identity of the picked inventory (inv# / roll# / dye lot / note). */
  pickedInventoryNumber: string
  pickedInventoryRollNumber: string
  pickedInventoryDyeLot: string
  pickedInventoryNote: string
  pickedInventoryStockUnitAbbrev: string
  pickedWorkOrderLabel: string
}

/**
 * Per-context picker visibility/lock state for the shared sticky-header picker
 * stack. `hidden` skips the trigger; `locked` renders a disabled trigger
 * showing its seeded value; `editable` opens a body-takeover picker.
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
 * provides.
 */
export type AdjustmentCreateSeed = {
  inventoryId?: string
  warehouseId?: string | null
  workOrderId?: string | null
  inventoryNumber?: string | null
  inventoryRollNumber?: string | null
  inventoryDyeLot?: string | null
  inventoryNote?: string | null
  warehouseLabel?: string
  locationLabel?: string
  workOrderLabel?: string
  stockUnitAbbrev?: string | null
  // Adjustment field values — seeded by the duplicate flow off the source row;
  // omitted (undefined) for a blank create, where they fall back to EMPTY_FORM.
  quantity?: string
  adjustmentType?: FlooringInventoryAdjustmentType
  isWaste?: boolean
  notes?: string
}

/**
 * Local "patch" emitted to the parent when an adjustment mutation completes.
 * Parents apply the patch to their adjustment snapshot (a flat array keyed by
 * adjustment id on both the WO Adjustments grid and the inventory side) to keep
 * the section in sync without a refetch.
 */
export type AdjustmentEditPatch =
  | { kind: "upsert"; adjustment: InventoryAdjustmentRow }
  | { kind: "delete"; adjustmentId: string }

export type AdjustmentEditMode = "create" | "edit"

/**
 * Row shape the panel renders in edit mode. Widens `InventoryAdjustmentRow` with
 * the server-resolved labels the inventory record view already surfaces on
 * `EnrichedInventoryAdjustmentRow` (`workOrderNumber`, `warehouseName`). Optional
 * because mutation responses come back as plain `InventoryAdjustmentRow` —
 * callers (and the update-mutation handler) carry labels forward from the prior
 * snapshot.
 */
export type AdjustmentEditRow = InventoryAdjustmentRow & {
  workOrderNumber?: string | null
  warehouseName?: string | null
}

/**
 * Open spec for the shared adjustment panel. One `create` shape (the host
 * supplies a `pickerConfig` describing which pickers are editable/locked and a
 * `seed` of prefill values) and one `edit` shape. Both surfaces — the WO record
 * view and the inventory hub — open the panel with the same union; only the
 * config + seed differ per context.
 */
export type AdjustmentEditOpenSpec =
  | {
      mode: "create"
      pickerConfig: AdjustmentPickerConfig
      seed: AdjustmentCreateSeed
    }
  | {
      mode: "edit"
      pickerConfig: AdjustmentPickerConfig
      adjustment: AdjustmentEditRow
    }
