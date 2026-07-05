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
 * Templates list-view chip — narrows the table by entity AND
 * scopes the Property chip's picker. Cascade clearing of Property on entity
 * change is handled by the parent client.
 */
export function EntityFilterChip({
  value,
  selectedLabel,
  onChange,
  onOptionSelected,
  initialOptions,
}: EntityFilterChipProps) {
  return (
    <div className="min-w-[14rem] max-w-[20rem]">
      <EntityTypePicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        onOptionSelected={onOptionSelected}
        initialOptions={initialOptions}
        placeholder="entity"
        searchPlaceholder="Search entities"
        emptyMessage="No entities match"
        clearLabel="Clear filter"
        ariaLabel="Filter templates by entity"
      />
    </div>
  )
}
