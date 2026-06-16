"use client"

import { useCallback, useState } from "react"
import type { InventoryRow, WarehouseOption } from "@builders/domain"

/**
 * The four scope fields the picker grid reads, plus the picked row. Mirrors the
 * slice of `InventoryRecordSelectionController` that `InventoryOptionsGrid`
 * consumes — so the same grid renders against this local state. The picked value
 * is the full `InventoryRow` so the modal can render it back as the selected
 * list row (and seed the create form from it).
 */
export type InventoryModalSelection = {
  warehouseId: string | null
  warehouseLabel: string | null
  productId: string | null
  productLabel: string | null
  inventoryId: string | null
  inventoryLabel: string | null
  /** The picked inventory row, or null until the operator chooses one. */
  picked: InventoryRow | null
  selectWarehouse: (option: WarehouseOption | null) => void
  selectProduct: (option: { id: string; name: string } | null) => void
  selectInventory: (row: InventoryRow | null) => void
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
  initialInventory?: InventoryRow | null
}): InventoryModalSelection {
  const [warehouseId, setWarehouseId] = useState(seedWarehouseId)
  const [warehouseLabel, setWarehouseLabel] = useState(seedWarehouseLabel)
  const [picked, setPicked] = useState<InventoryRow | null>(initialInventory)

  const selectWarehouse = useCallback((option: WarehouseOption | null) => {
    setWarehouseId(option?.id ?? null)
    setWarehouseLabel(option?.name ?? null)
    // Re-scoping the warehouse invalidates the picked inventory.
    setPicked(null)
  }, [])

  // Product is locked to the WOMI product; nothing to change.
  const selectProduct = useCallback(() => {}, [])

  const selectInventory = useCallback((row: InventoryRow | null) => {
    setPicked(row)
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
