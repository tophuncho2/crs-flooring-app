"use client"

import { useCallback, useMemo } from "react"
import { parseAsString, useQueryStates } from "nuqs"
import { useQuery } from "@tanstack/react-query"
import type { InventoryDetail, InventoryOption, WarehouseOption } from "@builders/domain"
import {
  INVENTORY_DETAIL_QUERY_KEY,
  inventoryDetailRequest,
} from "@/modules/inventory/data/inventory-detail-request"

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
}

const SELECTION_PARSERS = {
  warehouseId: parseAsString,
  warehouseLabel: parseAsString,
  inventoryId: parseAsString,
  inventoryLabel: parseAsString,
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

  const { warehouseId, warehouseLabel, inventoryId, inventoryLabel } = selection

  const selectWarehouse = useCallback(
    (option: WarehouseOption | null) => {
      // Changing the warehouse invalidates the inventory scope — clear it.
      void setSelection({
        warehouseId: option?.id ?? null,
        warehouseLabel: option?.name ?? null,
        inventoryId: null,
        inventoryLabel: null,
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
    })
  }, [setSelection])

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
    warehouseLabel,
    inventoryId,
    inventoryLabel,
    productFilterId: resolvedWoSeed?.productId ?? null,
    selectWarehouse,
    selectInventory,
    clear,
    inventory,
    isInventoryLoading,
    inventoryError,
    woSeed: resolvedWoSeed,
  }
}
