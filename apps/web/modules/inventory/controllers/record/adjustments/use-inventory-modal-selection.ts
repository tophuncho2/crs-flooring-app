"use client"

import { useCallback, useState } from "react"
import type { InventoryOption, WarehouseOption } from "@builders/domain"

/**
 * The four scope fields the picker grid reads, plus the picked option. Mirrors
 * the slice of `InventoryRecordSelectionController` that `InventoryOptionsGrid`
 * consumes — so the same grid renders against this local state.
 */
export type InventoryModalSelection = {
  warehouseId: string | null
  warehouseLabel: string | null
  productId: string | null
  productLabel: string | null
  inventoryId: string | null
  inventoryLabel: string | null
  /** The picked inventory option, or null until the operator chooses one. */
  picked: InventoryOption | null
  selectWarehouse: (option: WarehouseOption | null) => void
  selectProduct: (option: { id: string; name: string } | null) => void
  selectInventory: (option: InventoryOption | null) => void
}

/**
 * A non-URL inventory selection for the WO-create adjustment modal. The
 * inventory record view's `useInventoryRecordSelection` lives in the URL (so the
 * record view stays shareable); the modal must NOT touch the WO's URL, so it
 * holds the warehouse filter + picked inventory in local React state instead.
 *
 * Product is fixed for the modal's lifetime (the WOMI's product — the picker is
 * product-filtered, so all selectable inventory shares it); `selectProduct` is a
 * no-op kept only to satisfy the grid's handler shape. Warehouse stays editable
 * (cross-warehouse sourcing); changing it clears the picked inventory.
 */
export function useInventoryModalSelection({
  warehouseId: seedWarehouseId,
  warehouseLabel: seedWarehouseLabel,
  productId,
  productLabel,
  initialInventory = null,
}: {
  warehouseId: string | null
  warehouseLabel: string | null
  productId: string | null
  productLabel: string | null
  /** Pre-selected inventory (the duplicate flow seeds the source row). */
  initialInventory?: InventoryOption | null
}): InventoryModalSelection {
  const [warehouseId, setWarehouseId] = useState(seedWarehouseId)
  const [warehouseLabel, setWarehouseLabel] = useState(seedWarehouseLabel)
  const [picked, setPicked] = useState<InventoryOption | null>(initialInventory)

  const selectWarehouse = useCallback((option: WarehouseOption | null) => {
    setWarehouseId(option?.id ?? null)
    setWarehouseLabel(option?.name ?? null)
    // Re-scoping the warehouse invalidates the picked inventory.
    setPicked(null)
  }, [])

  // Product is locked to the WOMI product; nothing to change.
  const selectProduct = useCallback(() => {}, [])

  const selectInventory = useCallback((option: InventoryOption | null) => {
    setPicked(option)
  }, [])

  return {
    warehouseId,
    warehouseLabel,
    productId,
    productLabel,
    inventoryId: picked?.id ?? null,
    inventoryLabel: picked?.inventoryItem ?? null,
    picked,
    selectWarehouse,
    selectProduct,
    selectInventory,
  }
}
