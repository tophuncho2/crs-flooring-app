"use client"

import type { InventoryPurchaseOrderOption } from "@builders/domain"
import { InventoryPurchaseOrderPicker } from "@/modules/inventory/components/picker/inventory-purchase-order-picker"

export type PurchaseOrderFilterChipProps = {
  /** Selected purchaseOrderNumber snapshot string. */
  value: string | null
  onChange: (next: string | null) => void
  /**
   * Required scope — chip is disabled until a warehouse is picked, and the
   * inventory list cascades a clear here whenever the warehouse changes.
   */
  warehouseId: string | null
  /**
   * Mirrors the inventory list's archive segmented control so the chip
   * surfaces only PO #'s with at least one inventory row in the current
   * archive scope.
   */
  isArchived?: boolean
  initialOptions?: InventoryPurchaseOrderOption[]
}

export function PurchaseOrderFilterChip({
  value,
  onChange,
  warehouseId,
  isArchived,
  initialOptions,
}: PurchaseOrderFilterChipProps) {
  return (
    <InventoryPurchaseOrderPicker
      value={value}
      onChange={onChange}
      warehouseId={warehouseId}
      {...(isArchived !== undefined ? { isArchived } : {})}
      initialOptions={initialOptions}
      placeholder="Purchase order #"
      disabledPlaceholder="Select warehouse first"
      searchPlaceholder="Search PO #"
      emptyMessage="No POs match"
      clearLabel="Clear filter"
      ariaLabel="Filter inventory by purchase order number"
    />
  )
}
