"use client"

import { FilterPickerChip, usePickedOptionLabel } from "@/engines/picker"
import { EntityTypePicker } from "@/modules/entities/components/picker/entity-type-picker"
import type { EntityOption } from "@builders/domain"

/**
 * The certificates list's Entity filter — wraps the canonical `EntityTypePicker`
 * in the shared `FilterPickerChip` chrome and honours the picker label-binding
 * contract via `usePickedOptionLabel` (trigger label derives from the picked
 * option, never re-derived from the saved value).
 */
export function EntityFilterChip({
  selectedEntityId,
  selectedEntityLabel,
  onChange,
  initialOptions,
}: {
  selectedEntityId: string | null
  selectedEntityLabel: string | null
  onChange: (id: string | null) => void
  initialOptions?: EntityOption[]
}) {
  const entityFilter = usePickedOptionLabel<EntityOption>(
    selectedEntityId,
    selectedEntityLabel,
    (option) => option.entity,
  )

  return (
    <FilterPickerChip<EntityOption>
      value={selectedEntityId}
      onChange={onChange}
      selectedLabel={entityFilter.selectedLabel}
      onOptionSelected={entityFilter.onOptionSelected}
      nounSingular="Entity"
      nounPlural="entities"
      subject="certificates"
    >
      {(chrome) => <EntityTypePicker {...chrome} initialOptions={initialOptions} />}
    </FilterPickerChip>
  )
}
