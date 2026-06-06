"use client"

import { useCallback, useMemo } from "react"
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs"
import { useQuery } from "@tanstack/react-query"
import type {
  InventoryDetail,
  InventoryOption,
  InventoryRow,
  WarehouseOption,
} from "@builders/domain"
import {
  INVENTORY_DETAIL_QUERY_KEY,
  inventoryDetailRequest,
} from "@/modules/inventory/data/inventory-detail-request"

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
    coverageBalance: row.coverageBalance,
    itemCoverageUnitAbbrev: row.itemCoverageUnitAbbrev,
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

export type InventoryRecordSelectionController = {
  warehouseId: string | null
  warehouseLabel: string | null
  inventoryId: string | null
  inventoryLabel: string | null
  /** Product filter for the inventory picker (from the WO seed, when present). */
  productFilterId: string | null
  selectWarehouse: (option: WarehouseOption | null) => void
  selectInventory: (option: InventoryOption | null) => void
  clear: () => void
  /** Full record for the selected inventory, or null while none is loaded. */
  inventory: InventoryDetail | null
  isInventoryLoading: boolean
  inventoryError: string | null
  woSeed: InventoryRecordWoSeed | null
  /**
   * The adjustment drilldown / duplicate-create faces of the record view live in
   * the URL alongside the selection so switching inventory atomically discards a
   * stale `?adjustment` / `?duplicate` from the previous record (they're cleared
   * inside the select* / clear actions, never on mount, so a WO hand-off's entry
   * `?adjustment=new` survives until the operator manually re-picks).
   */
  adjustment: string | null
  setAdjustment: (adjustmentId: string | null) => void
  duplicate: boolean
  setDuplicate: (open: boolean) => void
}

const SELECTION_PARSERS = {
  warehouseId: parseAsString,
  warehouseLabel: parseAsString,
  inventoryId: parseAsString,
  inventoryLabel: parseAsString,
  adjustment: parseAsString,
  duplicate: parseAsBoolean,
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

  const { warehouseId, warehouseLabel, inventoryId, inventoryLabel, adjustment, duplicate } =
    selection

  const selectWarehouse = useCallback(
    (option: WarehouseOption | null) => {
      // Changing the warehouse invalidates the inventory scope — clear it, plus
      // any open adjustment / duplicate face from the previous record.
      void setSelection({
        warehouseId: option?.id ?? null,
        warehouseLabel: option?.name ?? null,
        inventoryId: null,
        inventoryLabel: null,
        adjustment: null,
        duplicate: null,
      })
    },
    [setSelection],
  )

  const selectInventory = useCallback(
    (option: InventoryOption | null) => {
      void setSelection({
        // A picked inventory carries its own warehouse — keep the header in sync.
        ...(option ? { warehouseId: option.warehouseId } : {}),
        inventoryId: option?.id ?? null,
        inventoryLabel: option?.inventoryItem ?? null,
        // Swapping the record discards the previous one's drilldown faces.
        adjustment: null,
        duplicate: null,
      })
    },
    [setSelection],
  )

  const clear = useCallback(() => {
    void setSelection({
      warehouseId: null,
      warehouseLabel: null,
      inventoryId: null,
      inventoryLabel: null,
      adjustment: null,
      duplicate: null,
    })
  }, [setSelection])

  const setAdjustment = useCallback(
    (adjustmentId: string | null) => {
      void setSelection({ adjustment: adjustmentId })
    },
    [setSelection],
  )

  const setDuplicate = useCallback(
    (open: boolean) => {
      void setSelection({ duplicate: open ? true : null })
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
    productFilterId: resolvedWoSeed?.productId ?? null,
    selectWarehouse,
    selectInventory,
    clear,
    inventory,
    isInventoryLoading,
    inventoryError,
    woSeed: resolvedWoSeed,
    adjustment,
    setAdjustment,
    duplicate: duplicate ?? false,
    setDuplicate,
  }
}
