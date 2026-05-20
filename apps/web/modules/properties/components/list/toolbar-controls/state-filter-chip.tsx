"use client"

import type { PropertyStateOption } from "@builders/domain"
import { PropertyStatePicker } from "@/modules/properties/components/picker/property-state-picker"

export type StateFilterChipProps = {
  value: string | null
  onChange: (value: string | null) => void
  initialOptions?: PropertyStateOption[]
}

/**
 * Properties list-view chip — narrows the table to a single state code.
 * State values are derived via `SELECT DISTINCT state` over property_hub, so
 * the dropdown never shows duplicates.
 */
export function StateFilterChip({
  value,
  onChange,
  initialOptions,
}: StateFilterChipProps) {
  return (
    <div className="min-w-[8rem] max-w-[12rem]">
      <PropertyStatePicker
        value={value}
        selectedLabel={value}
        onChange={onChange}
        initialOptions={initialOptions}
        placeholder="State"
        searchPlaceholder="Search state"
        emptyMessage="No states match"
        clearLabel="Clear filter"
        ariaLabel="Filter properties by state"
      />
    </div>
  )
}
