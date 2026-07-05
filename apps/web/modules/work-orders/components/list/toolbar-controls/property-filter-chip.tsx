"use client"

import type { PropertyOption } from "@builders/domain"
import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"

export type PropertyFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  /** Optional entity scope — when set, the picker narrows to that company. */
  entityId?: string | null
  onChange: (id: string | null) => void
  onOptionSelected?: (option: PropertyOption | null) => void
  initialOptions?: PropertyOption[]
}

/**
 * Work-order list-view chip — narrows the table to a single property AND
 * scopes the Template chip's picker (templates are property-scoped).
 * Cascade clearing of Template on property change is handled by the
 * parent client.
 */
export function PropertyFilterChip({
  value,
  selectedLabel,
  entityId = null,
  onChange,
  onOptionSelected,
  initialOptions,
}: PropertyFilterChipProps) {
  return (
    <PropertyPicker
      value={value}
      selectedLabel={selectedLabel}
      onChange={onChange}
      onOptionSelected={onOptionSelected}
      entityId={entityId}
      initialOptions={initialOptions}
      placeholder="Property"
      searchPlaceholder="Search properties"
      emptyMessage="No properties match"
      clearLabel="Clear filter"
      ariaLabel="Filter work orders by property"
    />
  )
}
