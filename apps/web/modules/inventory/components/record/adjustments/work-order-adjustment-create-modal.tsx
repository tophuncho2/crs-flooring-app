"use client"

import { useMemo, useState } from "react"
import { QuickCreateModal } from "@/engines/record-view"
import type { EnrichedInventoryAdjustmentRow, InventoryRow } from "@builders/domain"
import { useAdjustmentCreateForm } from "../../../controllers/record/adjustments/use-adjustment-create-form"
import { useInventoryModalSelection } from "../../../controllers/record/adjustments/use-inventory-modal-selection"
import { HUB_CREATE_PICKER_CONFIG } from "../../../controllers/record/adjustments/form"
import type { AdjustmentCreateSeed } from "../../../controllers/record/adjustments/types"
import { useInventoryOptionsGrid } from "../../../controllers/record/header/use-inventory-options-grid"
import { InventoryOptionsGrid } from "../header/inventory-options-grid"
import { AdjustmentInventoryIdentityRow } from "./adjustment-inventory-identity-row"
import { AdjustmentRecordFields } from "./adjustment-record-fields"

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

export type WorkOrderAdjustmentCreateModalProps = {
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
 * The work-order **shell** over the shared adjustment create core. The work order
 * picks inventory cross-warehouse, so this shell owns a local-state inventory
 * picker grid (warehouse + product both editable) above the shared form body; the
 * created adjustment links to this work order (any product).
 *
 * Variation lives here, not in the shared core: only this surface shows the
 * picker grid. The inventory record view's shell locks inventory instead. Both
 * inject the same four pieces into {@link useAdjustmentCreateForm} — scope, seed,
 * pickerConfig, onCreated — and render {@link AdjustmentRecordFields}.
 *
 * Mount it conditionally (only while a request is active) so each open starts
 * from a clean controller + selection.
 */
export function WorkOrderAdjustmentCreateModal({
  workOrder,
  product = null,
  initialInventory = null,
  onClose,
  onCreated,
}: WorkOrderAdjustmentCreateModalProps) {
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

  const { picked } = selection

  // Seed the shared create core off the picked inventory + the fixed WO context.
  // Memoized on `picked` only — typing in the form doesn't change `picked`, so the
  // form isn't re-seeded out from under the user; null until something is picked.
  const seed = useMemo<AdjustmentCreateSeed | null>(() => {
    if (!picked) return null
    return {
      inventoryId: picked.id,
      warehouseId: picked.warehouseId,
      warehouseLabel: selection.warehouseLabel ?? workOrder.warehouseName ?? undefined,
      inventoryItem: picked.inventoryItem,
      inventoryNumber: picked.inventoryNumber,
      inventoryRollNumber: picked.rollNumber,
      inventoryDyeLot: picked.dyeLot,
      inventoryNote: picked.note,
      locationLabel: picked.location ?? undefined,
      stockUnitAbbrev: picked.stockUnitAbbrev,
      // The adjustment links to this work order regardless of product (its
      // product is the chosen inventory's).
      workOrderId: workOrder.id,
      workOrderLabel: `#${workOrder.workOrderNumber}`,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked])

  const controller = useAdjustmentCreateForm({
    scope: { kind: "work-order", workOrderId: workOrder.id },
    seed,
    pickerConfig: HUB_CREATE_PICKER_CONFIG,
    onCreated,
  })

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
              shows, with a Change button to re-pick (open flow). */}
          {picked ? (
            <AdjustmentInventoryIdentityRow
              row={picked}
              onChange={() => setIsPicking(true)}
              disabled={isSaving}
            />
          ) : null}

          <AdjustmentRecordFields controller={controller} mode="create" adjustment={null} />
        </div>
      )}
    </QuickCreateModal>
  )
}
