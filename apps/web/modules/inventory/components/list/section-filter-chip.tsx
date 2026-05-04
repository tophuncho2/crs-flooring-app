"use client"

import { SectionPicker } from "@/modules/warehouse-sections/components/picker/section-picker"

export type SectionFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  warehouseId: string | null
  onChange: (id: string | null) => void
}

/**
 * Inventory list-view chip — narrows by warehouse section. Disabled until a
 * warehouse filter is set; clears automatically when the warehouse changes
 * (cascade handled by the parent client).
 */
export function SectionFilterChip({
  value,
  selectedLabel,
  warehouseId,
  onChange,
}: SectionFilterChipProps) {
  return (
    <div className="min-w-[12rem] max-w-[18rem]">
      <SectionPicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        warehouseId={warehouseId}
        placeholder="Filter by section"
        disabledPlaceholder="Pick warehouse first"
        searchPlaceholder="Search section #"
        emptyMessage="No sections match"
        clearLabel="Clear filter"
        ariaLabel="Filter inventory by section"
      />
    </div>
  )
}
