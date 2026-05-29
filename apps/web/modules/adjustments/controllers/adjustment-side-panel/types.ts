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
  pickedInventoryLabel: string
  pickedInventoryStockUnitAbbrev: string
  pickedWorkOrderLabel: string
  pickedWorkOrderItemLabel: string
  pickedWorkOrderItemNotes: string
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
 */
export type AdjustmentPanelPatch =
  | { kind: "upsert"; workOrderItemId: string | null; adjustment: InventoryAdjustmentRow }
  | { kind: "delete"; workOrderItemId: string | null; adjustmentId: string }

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
 * Optional prefill carried through create mode. Used by the work-orders
 * adjustment "duplicate" affordance to open the create panel with an inventory
 * item already selected (matching the source row). Carries the id + the two
 * picker-trigger labels so the `InventoryPicker` renders with the selection
 * visible immediately, before the user types into search.
 */
export type AdjustmentCreatePresetInventory = {
  id: string
  label: string
  stockUnitAbbrev: string | null
}

export type AdjustmentEditPanelOpenSpec =
  | {
      mode: "create"
      /**
       * WO-linked DEDUCTION ("cut") created under a WOMI from the work-orders
       * record view. The parent inventory is chosen via the inventory picker.
       */
      variant: "cut"
      workOrderItemId: string
      productId: string
      /**
       * Parent WO/warehouse labels carried through create so the panel can
       * hoist them onto the new row after a successful save (the create
       * response is a plain `InventoryAdjustmentRow` with no joined labels). The
       * subsequent re-open path hydrates these via `handleOpenEdit`.
       */
      workOrderNumber?: string | null
      warehouseName?: string | null
      presetInventory?: AdjustmentCreatePresetInventory
    }
  | {
      mode: "create"
      /**
       * Free-form INCREASE or DEDUCTION created from the inventory hub. Never
       * WO-linked, never waste. The parent inventory is the hub context, so
       * `inventoryId` is fixed on the spec (no picker).
       */
      variant: "manual"
      inventoryId: string
    }
  | { mode: "edit"; workOrderItemId: string | null; adjustment: AdjustmentPanelRow }
