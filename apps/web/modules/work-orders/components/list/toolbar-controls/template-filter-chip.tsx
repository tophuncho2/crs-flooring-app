"use client"

import type { TemplateOption } from "@builders/domain"
import { TemplatePicker } from "@/modules/templates/components/picker/template-picker"

export type TemplateFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  /**
   * Required scope — templates are property-scoped, so the chip is
   * disabled until a property filter is set. Pass the active property
   * filter's id through here.
   */
  propertyId: string | null
  onChange: (id: string | null) => void
  initialOptions?: TemplateOption[]
}

/**
 * Work-order list-view chip — narrows the table to a single template.
 * Template is property-scoped (the picker is disabled until a property is
 * picked; property change cascades a template clear via the parent
 * client).
 */
export function TemplateFilterChip({
  value,
  selectedLabel,
  propertyId,
  onChange,
  initialOptions,
}: TemplateFilterChipProps) {
  return (
    <div className="min-w-[14rem] max-w-[20rem]">
      <TemplatePicker
        value={value}
        selectedLabel={selectedLabel}
        onChange={onChange}
        propertyId={propertyId}
        initialOptions={initialOptions}
        placeholder="Template"
        disabledPlaceholder="Pick a property first"
        searchPlaceholder="Search templates"
        emptyMessage="No templates match"
        clearLabel="Clear filter"
        ariaLabel="Filter work orders by template"
      />
    </div>
  )
}
