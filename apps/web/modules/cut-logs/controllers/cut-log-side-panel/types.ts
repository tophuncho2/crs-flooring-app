import type { CutLogRow } from "@builders/domain"

/**
 * Editable form values for the cut-log side panel. `inventoryId` is editable
 * only in create mode; saved rows treat it as immutable. The `workOrderId` /
 * `workOrderItemId` pair is editable in edit mode on any non-voided,
 * non-queued row (the cut-log relink path — independent from the
 * pending-editable rule that locks `cut` / `notes` / `isWaste`).
 */
export type CutLogEditForm = {
  inventoryId: string
  cut: string
  isWaste: boolean
  notes: string
  workOrderId: string | null
  workOrderItemId: string | null
}

/**
 * UI-only narrowing filter (free-text location) plus snapshot label + unit
 * for the picker trigger. None of these ship to the cut-log API — the
 * persisted row carries only `inventoryId`. Local state lives outside
 * `CutLogEditForm` so the dirty check + mutation payload stay clean.
 */
export type CutLogPanelLocal = {
  locationFilter: string
  pickedInventoryLabel: string
  pickedInventoryStockUnitAbbrev: string
}

/**
 * Local "patch" emitted to the parent when a cut-log mutation completes.
 * Parents apply the patch to their cut-log snapshot (per-WOMI map on the
 * WO side, flat array on the inv side) to keep the section in sync
 * without a refetch.
 *
 * `workOrderItemId` is carried so the WO-side parent can route the patch
 * into the right WOMI bucket. The inv-side parent ignores it (its
 * snapshot is keyed by cut-log id).
 */
export type CutLogPanelPatch =
  | { kind: "upsert"; workOrderItemId: string | null; cutLog: CutLogRow }
  | { kind: "delete"; workOrderItemId: string | null; cutLogId: string }

export type CutLogEditPanelMode = "create" | "edit"

/**
 * Row shape the panel renders in edit mode. Widens `CutLogRow` with the
 * server-resolved labels the inventory record view already surfaces on
 * `InventoryCutLogRow` (`workOrderNumber`, `workOrderItemProductLabel`,
 * `warehouseName`). Optional because mutation responses come back as plain
 * `CutLogRow` — callers (and the update-mutation handler) carry labels
 * forward from the prior snapshot.
 */
export type CutLogPanelRow = CutLogRow & {
  workOrderNumber?: string | null
  workOrderItemProductLabel?: string | null
  warehouseName?: string | null
}

/**
 * Optional prefill carried through create mode. Used by the work-orders
 * cut-log "duplicate" affordance to open the create panel with an inventory
 * item already selected (matching the source row). Carries the id + the two
 * picker-trigger labels so the `InventoryPicker` renders with the selection
 * visible immediately, before the user types into search.
 */
export type CutLogCreatePresetInventory = {
  id: string
  label: string
  stockUnitAbbrev: string | null
}

export type CutLogEditPanelOpenSpec =
  | {
      mode: "create"
      workOrderItemId: string
      productId: string
      /**
       * Parent WO/warehouse labels carried through create so the panel can
       * hoist them onto the new row after a successful save (the create
       * response is a plain `CutLogRow` with no joined labels). The
       * subsequent re-open path hydrates these via `handleOpenEdit`.
       */
      workOrderNumber?: string | null
      warehouseName?: string | null
      presetInventory?: CutLogCreatePresetInventory
    }
  | { mode: "edit"; workOrderItemId: string | null; cutLog: CutLogPanelRow }
