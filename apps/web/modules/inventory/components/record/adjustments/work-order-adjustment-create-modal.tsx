"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { QuickCreateModal } from "@/engines/record-view"
import { DEFAULT_PALETTE_COLOR } from "@builders/domain"
import type {
  EnrichedInventoryAdjustmentRow,
  InventoryAdjustmentRow,
  InventoryRow,
} from "@builders/domain"
import { useAdjustmentCreateForm } from "../../../controllers/record/adjustments/use-adjustment-create-form"
import { useInventoryModalSelection } from "../../../controllers/record/adjustments/use-inventory-modal-selection"
import { HUB_CREATE_PICKER_CONFIG } from "../../../controllers/record/adjustments/form"
import type { AdjustmentCreateSeed } from "../../../controllers/record/adjustments/types"
import { useInventoryOptionsGrid } from "../../../controllers/record/header/use-inventory-options-grid"
import {
  INVENTORY_DETAIL_QUERY_KEY,
  inventoryDetailRequest,
} from "../../../data/inventory-detail-request"
import { InventoryOptionsGrid } from "../header/inventory-options-grid"
import { AdjustmentInventoryIdentityRow } from "./adjustment-inventory-identity-row"
import { AdjustmentRecordFields } from "./adjustment-record-fields"

/**
 * Build the inventory list row a duplicate's source adjustment represents, so the
 * modal can pre-select it. The adjustment carries the identity columns (inv# /
 * roll# / dye / note / location / product / warehouse) plus the FK-derived unit
 * abbrev/name (off `unitId`, resolved at read time); the import/PO/balance columns
 * it doesn't track stay blank — the modal fetches the real row by id to fill them
 * (see `detailQuery`). `id` is the inventory's id (the row stands for the
 * inventory item).
 */
function inventoryRowFromAdjustment(adj: EnrichedInventoryAdjustmentRow): InventoryRow {
  return {
    id: adj.inventoryId,
    inventoryNumber: adj.inventoryNumber ?? "",
    importEntryId: "",
    importNumber: null,
    purchaseOrderNumber: "",
    productId: adj.productId,
    productName: adj.productName,
    categoryId: "",
    unitName: adj.unitName ?? "",
    unitAbbrev: adj.unitAbbrev ?? "",
    rollPrefix: adj.rollPrefix ?? "",
    rollNumber: adj.rollNumber ?? "",
    dyeLot: adj.dyeLot ?? "",
    warehouseId: adj.warehouseId,
    warehouseName: adj.warehouseName,
    location: adj.location ?? "",
    startingStock: "",
    cost: "",
    freight: "",
    netDeducted: "",
    stockBalance: "",
    isArchived: false,
    note: adj.inventoryNote ?? "",
    internalNotes: "",
    // The adjustment row carries no parent inventory color (frozen snapshot, no
    // join) — placeholder; the modal fetches the real row by id to fill it.
    color: DEFAULT_PALETTE_COLOR,
    createdAt: "",
    updatedAt: "",
    // Parent inventory actors aren't tracked on the adjustment snapshot — the
    // modal fetches the real row by id to fill them.
    createdBy: null,
    updatedBy: null,
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
  /**
   * Duplicate flow: the source adjustment row. Pre-selects its inventory and
   * seeds the adjustment values (quantity / type / notes / waste). Null for a
   * blank / create-with-product flow (the picker grid opens instead).
   */
  source?: EnrichedInventoryAdjustmentRow | null
  /** Dismiss without creating (✕ / backdrop / Escape / Cancel). */
  onClose: () => void
  /**
   * Fired after a successful create with the new row — the host closes the modal,
   * reconciles (router.refresh), and can route/prompt to the created adjustment.
   */
  onCreated: (adjustment: InventoryAdjustmentRow) => void
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
  source = null,
  onClose,
  onCreated,
}: WorkOrderAdjustmentCreateModalProps) {
  // Duplicate pre-selects the source row's inventory; the synthesized row carries
  // identity only — the real balance/import columns are fetched below.
  const initialInventory = useMemo(
    () => (source ? inventoryRowFromAdjustment(source) : null),
    [source],
  )

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

  // Archive scope now lives inside the grid controller + its Filter menu (the
  // operator toggles Active/Archived there to find an archived row to adjust).
  const grid = useInventoryOptionsGrid({
    warehouseId: selection.warehouseId,
    productFilterId: selection.productId,
    enabled: isPicking,
  })

  const { picked } = selection

  // Duplicate seeds a *synthesized* row off the adjustment, which can't carry the
  // inventory's balance / import columns (the adjustment row doesn't track them) —
  // so the identity strip would show them blank. Fetch the real row by id and
  // render that instead. No-op for blank create (`initialInventory` null): there
  // the grid-picked row already carries those columns. Shares the record view's
  // detail cache via `INVENTORY_DETAIL_QUERY_KEY`.
  const duplicateInventoryId = initialInventory?.id ?? null
  const detailQuery = useQuery({
    enabled: duplicateInventoryId !== null,
    queryKey: [...INVENTORY_DETAIL_QUERY_KEY, duplicateInventoryId],
    queryFn: ({ signal }) => inventoryDetailRequest(duplicateInventoryId as string, signal),
  })

  // Prefer the fetched full row, but only while it still matches the picked item
  // (a re-pick swaps `picked` to a real grid row that already has the columns).
  const identityRow =
    detailQuery.data && detailQuery.data.id === picked?.id ? detailQuery.data : picked

  // Seed the shared create core off the picked inventory + the fixed WO context.
  // Memoized on `picked` only — typing in the form doesn't change `picked`, so the
  // form isn't re-seeded out from under the user; null until something is picked.
  const seed = useMemo<AdjustmentCreateSeed | null>(() => {
    if (!picked) return null
    // Carry the source row's adjustment values only while the picked item is
    // still the duplicate's inventory — a "Change" re-pick to a different item
    // starts a fresh (blank) adjustment.
    const dup = source && picked.id === source.inventoryId ? source : null
    return {
      inventoryId: picked.id,
      warehouseId: picked.warehouseId,
      warehouseLabel: selection.warehouseLabel ?? workOrder.warehouseName ?? undefined,
      inventoryNumber: picked.inventoryNumber,
      inventoryRollNumber: picked.rollNumber,
      inventoryDyeLot: picked.dyeLot,
      inventoryNote: picked.note,
      locationLabel: picked.location ?? undefined,
      unitAbbrev: picked.unitAbbrev,
      // The adjustment links to this work order regardless of product (its
      // product is the chosen inventory's).
      workOrderId: workOrder.id,
      workOrderLabel: `#${workOrder.workOrderNumber}`,
      // Duplicate carries the source adjustment's values forward; a blank /
      // re-picked create leaves them undefined → form defaults.
      quantity: dup?.quantity,
      adjustmentType: dup?.adjustmentType,
      isWaste: dup?.isWaste,
      internalNotes: dup?.internalNotes,
      area: dup?.area,
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
      widthClassName="max-w-6xl"
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
          {identityRow ? (
            <AdjustmentInventoryIdentityRow
              row={identityRow}
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
