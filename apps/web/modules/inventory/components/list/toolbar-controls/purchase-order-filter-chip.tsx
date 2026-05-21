"use client"

import type { ImportOption } from "@builders/domain"
import { PurchaseOrderNumberPicker } from "@/modules/imports/components/picker/purchase-order-number-picker"

export type PurchaseOrderFilterChipProps = {
  /** Selected purchaseOrderNumber snapshot string. */
  value: string | null
  /** Pre-resolved display label (e.g. `"PO# ABC-123"`). */
  selectedLabel: string | null
  onChange: (next: string | null) => void
  /**
   * Required scope — chip is disabled until a warehouse is picked, and the
   * inventory list cascades a clear here whenever the warehouse changes.
   */
  warehouseId: string | null
  initialOptions?: ImportOption[]
}

export function PurchaseOrderFilterChip({
  value,
  selectedLabel,
  onChange,
  warehouseId,
  initialOptions,
}: PurchaseOrderFilterChipProps) {
  return (
    <PurchaseOrderNumberPicker
      value={value}
      selectedLabel={selectedLabel}
      onChange={onChange}
      warehouseId={warehouseId}
      initialOptions={initialOptions}
      placeholder="Purchase order #"
      disabledPlaceholder="Select warehouse first"
      searchPlaceholder="Search PO # or import #"
      emptyMessage="No POs match"
      clearLabel="Clear filter"
      ariaLabel="Filter inventory by purchase order number"
    />
  )
}
