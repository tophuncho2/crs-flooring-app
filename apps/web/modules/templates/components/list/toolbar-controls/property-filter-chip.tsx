"use client"

import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"

export type PropertyFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  /** Optional management company scope — when set, narrows the picker. */
  managementCompanyId: string | null
  onChange: (id: string | null) => void
}

/**
 * Templates list-view chip — narrows the table to a single property. The
 * Management Company chip (if active) scopes the picker's search results,
 * but Property is also independently filterable on the table without an MC
 * set.
 */
export function PropertyFilterChip({
  value,
  selectedLabel,
  managementCompanyId,
  onChange,
}: PropertyFilterChipProps) {
  return (
    <div className="min-w-[14rem] max-w-[20rem]">
      <PropertyPicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        managementCompanyId={managementCompanyId}
        placeholder="Filter by property"
        searchPlaceholder="Search properties"
        emptyMessage="No properties match"
        clearLabel="Clear filter"
        ariaLabel="Filter templates by property"
      />
    </div>
  )
}
