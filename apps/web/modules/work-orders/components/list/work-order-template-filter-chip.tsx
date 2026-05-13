"use client"

import type { TemplateOption } from "@builders/domain"
import { PickerFilterChip } from "@/components/features/filter"
import { TemplatePicker } from "@/modules/templates/components/picker/template-picker"

export type WorkOrderTemplateFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  onChange: (id: string | null) => void
  /**
   * Required scope — templates are property-scoped, so the chip is
   * disabled until a property filter is set. Pass the active property
   * filter's id through here.
   */
  propertyId: string | null
  initialOptions?: TemplateOption[]
}

export function WorkOrderTemplateFilterChip({
  value,
  selectedLabel,
  onChange,
  propertyId,
  initialOptions,
}: WorkOrderTemplateFilterChipProps) {
  return (
    <PickerFilterChip>
      <TemplatePicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        propertyId={propertyId}
        initialOptions={initialOptions}
        placeholder="Filter by template"
        disabledPlaceholder="Pick a property first"
        searchPlaceholder="Search templates"
        emptyMessage="No templates match"
        clearLabel="Clear filter"
        ariaLabel="Filter work orders by template"
      />
    </PickerFilterChip>
  )
}
