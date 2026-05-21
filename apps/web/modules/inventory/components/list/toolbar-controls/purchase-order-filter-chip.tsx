"use client"

import type { ImportOption } from "@builders/domain"
import { PurchaseOrderNumberPicker } from "@/modules/imports/components/picker/purchase-order-number-picker"

export type PurchaseOrderFilterChipProps = {
  /** Selected purchaseOrderNumber snapshot string. */
  value: string | null
  /** Pre-resolved display label (e.g. `"PO# ABC-123"`). */
  selectedLabel: string | null
  onChange: (next: string | null) => void
  initialOptions?: ImportOption[]
}

export function PurchaseOrderFilterChip({
  value,
  selectedLabel,
  onChange,
  initialOptions,
}: PurchaseOrderFilterChipProps) {
  return (
    <div className="min-w-[14rem] max-w-[20rem]">
      <PurchaseOrderNumberPicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        initialOptions={initialOptions}
        placeholder="Purchase order #"
        searchPlaceholder="Search PO # or import #"
        emptyMessage="No POs match"
        clearLabel="Clear filter"
        ariaLabel="Filter inventory by purchase order number"
      />
    </div>
  )
}
