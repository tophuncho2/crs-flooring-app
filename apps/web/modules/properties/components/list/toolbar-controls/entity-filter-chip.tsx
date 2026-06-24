"use client"

import type { EntityOption } from "@builders/domain"
import { EntityPicker } from "@/modules/entities/components/picker/entity-picker"

export type EntityFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  onChange: (id: string | null) => void
  initialOptions?: EntityOption[]
}

/**
 * Properties list-view chip — narrows the table to a single management
 * company. Renders the canonical `EntityPicker` so the
 * dropdown chrome + server-side search is shared with every other consumer.
 */
export function EntityFilterChip({
  value,
  selectedLabel,
  onChange,
  initialOptions,
}: EntityFilterChipProps) {
  return (
    <EntityPicker
      value={value}
      selectedLabel={selectedLabel}
      onChange={onChange}
      initialOptions={initialOptions}
      placeholder="Entity"
      searchPlaceholder="Search entities"
      emptyMessage="No entities match"
      clearLabel="Clear filter"
      ariaLabel="Filter properties by entity"
    />
  )
}
