"use client"

import { useCallback, useMemo } from "react"
import { parseAsString, useQueryStates } from "nuqs"
import { useQuery } from "@tanstack/react-query"
import type {
  InventoryDetail,
  InventoryNeighbor,
  InventoryOption,
  InventoryRow,
  ProductOption,
  WarehouseOption,
} from "@builders/domain"
import {
  INVENTORY_DETAIL_QUERY_KEY,
  inventoryDetailRequest,
} from "@/modules/inventory/data/inventory-detail-request"

/**
 * Sentinel `?adjustment` value that opens the embedded "new adjustment" form.
 * Lives here (not in the record view) because the selection controller owns the
 * `adjustment` param and has to distinguish this record-agnostic *create intent*
 * (form mode — survives inventory/warehouse/product swaps) from a concrete
 * `?adjustment=<id>` *edit drilldown* (record-bound — cleared on swap).
 */
export const NEW_ADJUSTMENT_ID = "new"

/**
 * On a header swap (warehouse / product / inventory) keep the create intent
 * ("new") alive so a WO hand-off — or an in-record "Add adjustment" — flows
 * straight into the form for the newly selected item with no second click; drop
 * a concrete edit drilldown id, which is meaningless on a different record.
 */
function preserveCreateIntent(current: string | null): string | null {
  return current === NEW_ADJUSTMENT_ID ? NEW_ADJUSTMENT_ID : null
}

/**
 * Map a full list-view inventory row to the lighter `InventoryOption` the
 * selection accepts. Lets the multi-bar picker grid (which fetches `InventoryRow`s
 * via the list endpoint) feed `selectInventory` without a second request.
 */
export function toInventoryOption(row: InventoryRow): InventoryOption {
  return {
    id: row.id,
    inventoryItem: row.inventoryItem,
    inventoryNumber: row.inventoryNumber,
    rollNumber: row.rollNumber,
    dyeLot: row.dyeLot,
    note: row.note,
    warehouseId: row.warehouseId,
    location: row.location,
    stockBalance: row.stockBalance,
    stockUnitAbbrev: row.stockUnitAbbrev,
  }
}

/**
 * Work-order context carried when the record view is opened from a WO material
 * item. `productId` product-filters the inventory picker (the operator only
 * sees inventory matching the material item's product); the rest pre-links the
 * adjustment create form to the WO (still editable). Null when opened from the
 * inventory list/ledger.
 */
export type InventoryRecordWoSeed = {
  workOrderId: string
  workOrderItemId: string | null
  workOrderLabel: string | null
  productId: string | null
  materialItemLabel: string | null
  materialItemNotes: string | null
}

/**
 * A point-in-time copy of the header's URL selection. Captured when the operator
 * begins re-picking an already-selected item so the reference header's "Discard"
 * action can atomically restore it (warehouse + product + inventory + the
 * adjustment face) without replaying cascade-clears.
 */
export type InventorySelectionSnapshot = {
  warehouseId: string | null
  warehouseLabel: string | null
  productId: string | null
  productLabel: string | null
  inventoryId: string | null
  inventoryLabel: string | null
  adjustment: string | null
}

export type InventoryRecordSelectionController = {
  warehouseId: string | null
  warehouseLabel: string | null
  inventoryId: string | null
  inventoryLabel: string | null
  /**
   * The header product picker's selection — the master filter that narrows the
   * inventory picker grid (and, downstream, the adjustment form's WO picker). On
   * a WO hand-off the URL seeds it from the material item's product; otherwise
   * the operator picks it to narrow their search.
   */
  productId: string | null
  productLabel: string | null
  /** True while the record view is in "add adjustment" mode (`?adjustment=new`). */
  isAdjustmentFormMode: boolean
  selectWarehouse: (option: WarehouseOption | null) => void
  selectProduct: (option: ProductOption | null) => void
  selectInventory: (option: InventoryOption | null) => void
  /**
   * Step the header to an adjacent inventory row (the record-view shell stepper,
   * ◀ INV-# ▶). The stepper walks the global inventory-number sequence — which
   * can cross warehouses — so this syncs the header warehouse to the target and
   * clears the labels, letting them re-resolve from the freshly loaded record.
   */
  stepToInventory: (neighbor: InventoryNeighbor) => void
  clear: () => void
  /**
   * Atomically restore a previously captured selection (the "Discard" action on
   * the reference header). One `setSelection` write, so it bypasses the
   * cascade-clears that the per-field `select*` setters apply.
   */
  restore: (snapshot: InventorySelectionSnapshot) => void
  /** Full record for the selected inventory, or null while none is loaded. */
  inventory: InventoryDetail | null
  isInventoryLoading: boolean
  inventoryError: string | null
  woSeed: InventoryRecordWoSeed | null
  /**
   * The adjustment drilldown face of the record view lives in the URL alongside
   * the selection so switching inventory atomically discards a stale
   * `?adjustment` from the previous record (cleared inside the select* / clear
   * actions, never on mount, so a WO hand-off's entry `?adjustment=new` survives
   * until the operator manually re-picks).
   */
  adjustment: string | null
  setAdjustment: (adjustmentId: string | null) => void
}

const SELECTION_PARSERS = {
  warehouseId: parseAsString,
  warehouseLabel: parseAsString,
  productId: parseAsString,
  productLabel: parseAsString,
  inventoryId: parseAsString,
  inventoryLabel: parseAsString,
  adjustment: parseAsString,
}

/**
 * Owns the inventory record view's Warehouse → Inventory header selection. The
 * selection lives in the URL query string (so refresh / share / back stay
 * coherent and the WO hand-off seeds the pickers); changing the warehouse
 * cascade-clears the inventory. Loads the full editable record client-side when
 * an inventory item is selected (mirrors the templates record view's
 * `useQuery(TEMPLATE_DETAIL_QUERY_KEY)` load), seeding from the SSR-prefetched
 * record when a deep-link resolves cleanly.
 */
export function useInventoryRecordSelection({
  initialInventory,
  woSeed,
}: {
  initialInventory?: InventoryDetail | null
  woSeed?: InventoryRecordWoSeed | null
}): InventoryRecordSelectionController {
  const [selection, setSelection] = useQueryStates(SELECTION_PARSERS, { history: "replace" })

  const {
    warehouseId,
    warehouseLabel,
    productId,
    productLabel,
    inventoryId,
    inventoryLabel,
    adjustment,
  } = selection

  const selectWarehouse = useCallback(
    (option: WarehouseOption | null) => {
      // Changing the warehouse invalidates the inventory scope — clear it, plus
      // any concrete adjustment drilldown from the previous record (the create
      // intent rides through). Product is warehouse-independent, so it stays.
      void setSelection({
        warehouseId: option?.id ?? null,
        warehouseLabel: option?.name ?? null,
        inventoryId: null,
        inventoryLabel: null,
        adjustment: preserveCreateIntent(adjustment),
      })
    },
    [setSelection, adjustment],
  )

  const selectProduct = useCallback(
    (option: ProductOption | null) => {
      // Product is the master filter: changing it invalidates the selected
      // inventory (inventory is single-product), so cascade-clear it. Keep the
      // create intent (form mode) alive — the operator re-picks a matching item.
      void setSelection({
        productId: option?.id ?? null,
        productLabel: option?.name ?? null,
        inventoryId: null,
        inventoryLabel: null,
        adjustment: preserveCreateIntent(adjustment),
      })
    },
    [setSelection, adjustment],
  )

  const selectInventory = useCallback(
    (option: InventoryOption | null) => {
      void setSelection({
        // A picked inventory carries its own warehouse — keep the header in sync.
        ...(option ? { warehouseId: option.warehouseId } : {}),
        inventoryId: option?.id ?? null,
        inventoryLabel: option?.inventoryItem ?? null,
        // Swapping the record discards a concrete drilldown but preserves the
        // create intent, so a WO hand-off lands straight in the form.
        adjustment: preserveCreateIntent(adjustment),
      })
    },
    [setSelection, adjustment],
  )

  const stepToInventory = useCallback(
    (neighbor: InventoryNeighbor) => {
      void setSelection({
        // The stepper walks the global inventory-number line, which can cross
        // warehouses — sync the header warehouse to the stepped-to row. Clear the
        // labels so they fall back to the newly loaded record's names (the same
        // fallback a cold list-row deep-link relies on).
        warehouseId: neighbor.warehouseId,
        warehouseLabel: null,
        inventoryId: neighbor.id,
        inventoryLabel: null,
        // Swapping the record drops a concrete drilldown but keeps create intent.
        adjustment: preserveCreateIntent(adjustment),
      })
    },
    [setSelection, adjustment],
  )

  const clear = useCallback(() => {
    // The explicit "Clear" reset also exits form mode (adjustment → null).
    void setSelection({
      warehouseId: null,
      warehouseLabel: null,
      productId: null,
      productLabel: null,
      inventoryId: null,
      inventoryLabel: null,
      adjustment: null,
    })
  }, [setSelection])

  const restore = useCallback(
    (snapshot: InventorySelectionSnapshot) => {
      void setSelection(snapshot)
    },
    [setSelection],
  )

  const setAdjustment = useCallback(
    (adjustmentId: string | null) => {
      void setSelection({ adjustment: adjustmentId })
    },
    [setSelection],
  )

  const inventoryQuery = useQuery({
    queryKey: [...INVENTORY_DETAIL_QUERY_KEY, inventoryId],
    queryFn: ({ signal }) => inventoryDetailRequest(inventoryId!, signal),
    enabled: inventoryId !== null,
    // Seed once and keep stable so the record panel below isn't reseeded (and
    // unsaved edits aren't clobbered) by a background refetch.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    initialData:
      initialInventory && initialInventory.id === inventoryId ? initialInventory : undefined,
  })

  const inventory = inventoryId !== null ? inventoryQuery.data ?? null : null
  const isInventoryLoading = inventoryId !== null && inventoryQuery.isLoading
  const inventoryError =
    inventoryId !== null && inventoryQuery.isError
      ? inventoryQuery.error instanceof Error
        ? inventoryQuery.error.message
        : "Failed to load inventory."
      : null

  // The WO seed is fixed for the session (the WO context doesn't change as the
  // operator browses inventory); keep its identity stable.
  const resolvedWoSeed = useMemo(() => woSeed ?? null, [woSeed])

  return {
    warehouseId,
    // Fall back to the loaded record's labels so the picker triggers render the
    // warehouse name / inventory item string even when the entry URL carried
    // only the ids (e.g. the list row click passes `inventoryId` alone).
    warehouseLabel: warehouseLabel ?? inventory?.warehouseName ?? null,
    inventoryId,
    inventoryLabel: inventoryLabel ?? inventory?.inventoryItem ?? null,
    productId,
    // Fall back to the WO seed's material-item label (the product name) so the
    // picker trigger renders on a fresh hand-off before any product search runs.
    productLabel: productLabel ?? resolvedWoSeed?.materialItemLabel ?? null,
    isAdjustmentFormMode: adjustment === NEW_ADJUSTMENT_ID,
    selectWarehouse,
    selectProduct,
    selectInventory,
    stepToInventory,
    clear,
    restore,
    inventory,
    isInventoryLoading,
    inventoryError,
    woSeed: resolvedWoSeed,
    adjustment,
    setAdjustment,
  }
}
