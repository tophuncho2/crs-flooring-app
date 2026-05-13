"use client"

import type { PropertyOption } from "@builders/domain"
import { PickerFilterChip } from "@/components/features/filter"
import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"

export type WorkOrderPropertyFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  onChange: (id: string | null) => void
  managementCompanyId?: string | null
  initialOptions?: PropertyOption[]
}

export function WorkOrderPropertyFilterChip({
  value,
  selectedLabel,
  onChange,
  managementCompanyId = null,
  initialOptions,
}: WorkOrderPropertyFilterChipProps) {
  return (
    <PickerFilterChip>
      <PropertyPicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        managementCompanyId={managementCompanyId}
        initialOptions={initialOptions}
        placeholder="Filter by property"
        searchPlaceholder="Search properties"
        emptyMessage="No properties match"
        clearLabel="Clear filter"
        ariaLabel="Filter work orders by property"
      />
    </PickerFilterChip>
  )
}
