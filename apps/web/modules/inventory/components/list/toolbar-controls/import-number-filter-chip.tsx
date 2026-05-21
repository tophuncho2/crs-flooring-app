"use client"

import type { ImportOption } from "@builders/domain"
import { ImportNumberPicker } from "@/modules/imports/components/picker/import-number-picker"

export type ImportNumberFilterChipProps = {
  /** Selected importNumber snapshot string (e.g. `"123"`). */
  value: string | null
  /** Pre-resolved display label (e.g. `"#IMP-123"`). */
  selectedLabel: string | null
  onChange: (next: string | null) => void
  /**
   * Required scope. Imports belong to a warehouse; the chip is disabled
   * until a warehouse is picked, and the inventory list cascades a clear
   * here whenever the warehouse changes.
   */
  warehouseId: string | null
  initialOptions?: ImportOption[]
}

export function ImportNumberFilterChip({
  value,
  selectedLabel,
  onChange,
  warehouseId,
  initialOptions,
}: ImportNumberFilterChipProps) {
  return (
    <ImportNumberPicker
      value={value}
      selectedLabel={selectedLabel}
      onChange={onChange}
      warehouseId={warehouseId}
      initialOptions={initialOptions}
      placeholder="Import #"
      disabledPlaceholder="Select warehouse first"
      searchPlaceholder="Search import # or PO #"
      emptyMessage="No imports match"
      clearLabel="Clear filter"
      ariaLabel="Filter inventory by import number"
    />
  )
}
