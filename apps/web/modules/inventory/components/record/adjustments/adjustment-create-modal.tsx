"use client"

import { useEffect, useState } from "react"
import { QuickCreateModal } from "@/engines/record-view"
import { DataTable } from "@/engines/list-view"
import type { EnrichedInventoryAdjustmentRow, InventoryRow } from "@builders/domain"
import { useAdjustmentEditController } from "../../../controllers/record/adjustments/use-adjustment-edit-controller"
import { useInventoryModalSelection } from "../../../controllers/record/adjustments/use-inventory-modal-selection"
import { HUB_CREATE_PICKER_CONFIG } from "../../../controllers/record/adjustments/form"
import { useInventoryOptionsGrid } from "../../../controllers/record/header/use-inventory-options-grid"
import { InventoryOptionsGrid } from "../header/inventory-options-grid"
import { INVENTORY_LIST_COLUMNS } from "../../list/table/inventory-list-columns"
import { renderInventoryRowCell } from "../../list/table/inventory-row-cell"
import { InventoryFieldGrid } from "../fields"
import { AdjustmentPickerStack } from "./adjustment-picker-stack"
import { AdjustmentEditFormFields } from "./adjustment-edit-form-fields"

/**
 * Build the inventory list row a duplicate's source adjustment represents, so the
 * modal can render it as the selected row (and seed the create form). The
 * adjustment carries the identity columns (inv# / roll# / dye / note / location /
 * product / warehouse / unit); the import/PO/balance columns it doesn't track
 * render as "—". `id` is the inventory's id (the row stands for the inventory item).
 */
export function inventoryRowFromAdjustment(adj: EnrichedInventoryAdjustmentRow): InventoryRow {
  return {
    id: adj.inventoryId,
    inventoryNumber: adj.inventoryNumber ?? "",
    importEntryId: "",
    importNumber: "",
    purchaseOrderNumber: "",
    productId: adj.productId,
    productName: adj.productName,
    categoryId: "",
    categoryName: "",
    categorySlug: adj.categorySlug,
    stockUnitName: adj.stockUnitName ?? "",
    stockUnitAbbrev: adj.stockUnitAbbrev ?? "",
    sendUnitName: "",
    sendUnitAbbrev: "",
    rollPrefix: adj.rollPrefix ?? "",
    rollNumber: adj.rollNumber ?? "",
    dyeLot: adj.dyeLot ?? "",
    warehouseId: adj.warehouseId,
    warehouseName: adj.warehouseName,
    warehouseNumber: "",
    location: adj.location ?? "",
    startingStock: "",
    netDeducted: "",
    stockBalance: "",
    isArchived: false,
    wasMerged: false,
    note: adj.inventoryNote ?? "",
    internalNotes: "",
    inventoryItem: adj.inventoryItem,
    fifoReceivedAt: "",
    createdAt: "",
    updatedAt: "",
  }
}

export type AdjustmentCreateModalWorkOrder = {
  id: string
  workOrderNumber: string
  /** Seeds the inventory picker's warehouse filter (editable; null lists all warehouses). */
  warehouseId: string | null
  warehouseName: string | null
}

export type AdjustmentCreateModalProps = {
  workOrder: AdjustmentCreateModalWorkOrder
  /**
   * Optional starting product filter for the inventory picker — the WO row's
   * "create with matching product" affordance seeds it; null lets the operator
   * pick any product. Editable either way (adjustments link to any product).
   */
  product?: { id: string; name: string } | null
  /** Duplicate flow: pre-select the source row's inventory (quantity stays blank). */
  initialInventory?: InventoryRow | null
  /** Dismiss without creating (✕ / backdrop / Escape / Cancel). */
  onClose: () => void
  /** Fired after a successful create — the host closes the modal and reconciles (router.refresh). */
  onCreated: () => void
}

/**
 * The shared adjustment **create** form as a centered modal over the work-order
 * record view, so the operator never leaves the WO to add an adjustment. It
 * composes a local-state inventory picker (warehouse + product both editable,
 * over the same grid the inventory reference header uses) above the chrome-less
 * adjustment form fields, driven by the shared `useAdjustmentEditController` in
 * work-order scope. The created adjustment links to this work order (any
 * product).
 *
 * On create success the controller fires `onCreated` (then closes its panel); the
 * host unmounts the modal and `router.refresh()`es so the WO reloads the fresh
 * Adjustments grid. Editing an existing row still happens on the inventory
 * record view — this modal is create/duplicate only.
 *
 * Mount it conditionally (only while a request is active) so each open starts
 * from a clean controller + selection.
 */
export function AdjustmentCreateModal({
  workOrder,
  product = null,
  initialInventory = null,
  onClose,
  onCreated,
}: AdjustmentCreateModalProps) {
  const selection = useInventoryModalSelection({
    warehouseId: workOrder.warehouseId,
    warehouseLabel: workOrder.warehouseName,
    productId: product?.id ?? null,
    productLabel: product?.name ?? null,
    initialInventory,
  })

  // Re-open the picker grid to swap inventory; collapses to the form once an item
  // is chosen. Starts open only when nothing is pre-selected.
  const [isPicking, setIsPicking] = useState(initialInventory === null)

  const grid = useInventoryOptionsGrid({
    warehouseId: selection.warehouseId,
    productFilterId: selection.productId,
    enabled: isPicking,
  })

  const controller = useAdjustmentEditController({
    scope: { kind: "work-order", workOrderId: workOrder.id },
    canCreate: true,
    // The WO reconciles by reloading fresh (router.refresh in onCreated), so the
    // in-place publish patch is unused here.
    publish: () => {},
    onCreated,
  })

  const { picked } = selection

  // Drive the create panel off the picked inventory. Picking (or swapping) an
  // item re-seeds the form from that inventory + the fixed WO context; clearing
  // it closes the panel. Keyed on the picked option only — typing in the form
  // doesn't change `picked`, so the form isn't re-seeded out from under the user.
  useEffect(() => {
    if (!picked) {
      controller.close()
      return
    }
    controller.openPanel({
      mode: "create",
      pickerConfig: HUB_CREATE_PICKER_CONFIG,
      seed: {
        inventoryId: picked.id,
        warehouseId: picked.warehouseId,
        warehouseLabel: selection.warehouseLabel ?? workOrder.warehouseName ?? undefined,
        inventoryItem: picked.inventoryItem,
        inventoryNumber: picked.inventoryNumber,
        inventoryRollNumber: picked.rollNumber,
        inventoryDyeLot: picked.dyeLot,
        inventoryNote: picked.note,
        locationLabel: picked.location ?? undefined,
        // The adjustment links to this work order regardless of product (its
        // product is the chosen inventory's).
        stockUnitAbbrev: picked.stockUnitAbbrev,
        workOrderId: workOrder.id,
        workOrderLabel: `#${workOrder.workOrderNumber}`,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked])

  const { canSave, isSaving, error } = controller
  const showGrid = !picked || isPicking

  return (
    <QuickCreateModal
      open
      title="Add adjustment"
      widthClassName="max-w-5xl"
      onClose={onClose}
      onCreate={() => controller.save()}
      canCreate={!showGrid && canSave}
      isSaving={isSaving}
      error={error?.message ?? null}
    >
      {showGrid ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--foreground)]/70">
            Choose the inventory item to adjust for this work order.
          </p>
          <InventoryOptionsGrid
            selection={selection}
            grid={grid}
            productEditable
            onSelectWarehouse={selection.selectWarehouse}
            onSelectProduct={selection.selectProduct}
            onSelectInventory={(option) => {
              selection.selectInventory(option)
              setIsPicking(false)
            }}
          />
          {picked ? (
            <button
              type="button"
              onClick={() => setIsPicking(false)}
              className="self-start text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              Cancel re-pick
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Selected inventory rendered as the same single list row the grid
              shows (horizontally scrollable), with a Change button to re-pick. */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/55">
                Selected item
              </span>
              <button
                type="button"
                onClick={() => setIsPicking(true)}
                disabled={isSaving}
                className="shrink-0 rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]/80 transition hover:border-sky-500/45 hover:text-[var(--foreground)] disabled:opacity-50"
              >
                Change
              </button>
            </div>
            {picked ? (
              <DataTable
                rows={[picked]}
                columns={INVENTORY_LIST_COLUMNS}
                renderCell={renderInventoryRowCell}
              />
            ) : null}
          </div>

          <InventoryFieldGrid>
            <AdjustmentPickerStack controller={controller} />
            <AdjustmentEditFormFields mode="create" adjustment={null} controller={controller} />
          </InventoryFieldGrid>
        </div>
      )}
    </QuickCreateModal>
  )
}
