"use client"

import type { InventoryImportNumberOption } from "@builders/domain"
import { InventoryImportNumberPicker } from "@/modules/inventory/components/picker/inventory-import-number-picker"

export type ImportNumberFilterChipProps = {
  /** Selected importNumber snapshot string (e.g. `"123"`). */
  value: string | null
  onChange: (next: string | null) => void
  /**
   * Required scope. Inventory rows belong to a warehouse; the chip is disabled
   * until a warehouse is picked, and the inventory list cascades a clear
   * here whenever the warehouse changes.
   */
  warehouseId: string | null
  /**
   * Mirrors the inventory list's archive segmented control so the chip
   * surfaces only import #'s with at least one inventory row in the current
   * archive scope.
   */
  isArchived?: boolean
  initialOptions?: InventoryImportNumberOption[]
}

export function ImportNumberFilterChip({
  value,
  onChange,
  warehouseId,
  isArchived,
  initialOptions,
}: ImportNumberFilterChipProps) {
  return (
    <InventoryImportNumberPicker
      value={value}
      onChange={onChange}
      warehouseId={warehouseId}
      {...(isArchived !== undefined ? { isArchived } : {})}
      initialOptions={initialOptions}
      placeholder="Import #"
      disabledPlaceholder="Select warehouse first"
      searchPlaceholder="Search import #"
      emptyMessage="No imports match"
      clearLabel="Clear filter"
      ariaLabel="Filter inventory by import number"
    />
  )
}
