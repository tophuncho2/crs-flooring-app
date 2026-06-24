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
 * Templates list-view chip — narrows the table by entity AND
 * scopes the Property chip's picker. Cascade clearing of Property on entity
 * change is handled by the parent client.
 */
export function EntityFilterChip({
  value,
  selectedLabel,
  onChange,
  initialOptions,
}: EntityFilterChipProps) {
  return (
    <div className="min-w-[14rem] max-w-[20rem]">
      <EntityPicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
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
