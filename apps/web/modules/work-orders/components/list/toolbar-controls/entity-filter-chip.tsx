"use client"

import type { EntityOption } from "@builders/domain"
import { EntityTypePicker } from "@/modules/entities/components/picker/entity-type-picker"

export type EntityFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  onChange: (id: string | null) => void
  onOptionSelected?: (option: EntityOption | null) => void
  initialOptions?: EntityOption[]
}

/**
 * Work-order list-view chip — narrows the table to a single management
 * company AND scopes the Property chip's picker. Cascade clearing of
 * Property + Template on entity change is handled by the parent client.
 */
export function EntityFilterChip({
  value,
  selectedLabel,
  onChange,
  onOptionSelected,
  initialOptions,
}: EntityFilterChipProps) {
  return (
    <EntityTypePicker
      value={value}
      selectedLabel={selectedLabel}
      onChange={onChange}
      onOptionSelected={onOptionSelected}
      initialOptions={initialOptions}
      placeholder="Entity"
      searchPlaceholder="Search entities"
      emptyMessage="No entities match"
      clearLabel="Clear filter"
      ariaLabel="Filter work orders by entity"
    />
  )
}
