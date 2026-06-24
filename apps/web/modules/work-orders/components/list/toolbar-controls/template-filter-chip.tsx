"use client"

import type { TemplateOption } from "@builders/domain"
import { TemplatePicker } from "@/modules/templates/components/picker/template-picker"

export type TemplateFilterChipProps = {
  value: string | null
  selectedLabel: string | null
  /**
   * Optional property scope. When set, the dropdown narrows to that
   * property's templates; when null the chip is still selectable.
   */
  propertyId: string | null
  /**
   * Optional entity scope, used only when no property is set — narrows the
   * dropdown to templates under that entity's properties.
   */
  entityId: string | null
  onChange: (id: string | null) => void
  initialOptions?: TemplateOption[]
}

/**
 * Work-order list-view chip — narrows the table to a single template.
 * Always selectable (`requireProperty={false}`); the dropdown options narrow
 * by whatever entity/property filter is active. A parent entity/property change still
 * cascades a template clear via the parent client.
 */
export function TemplateFilterChip({
  value,
  selectedLabel,
  propertyId,
  entityId,
  onChange,
  initialOptions,
}: TemplateFilterChipProps) {
  return (
    <TemplatePicker
      value={value}
      selectedLabel={selectedLabel}
      onChange={onChange}
      propertyId={propertyId}
      entityId={entityId}
      requireProperty={false}
      initialOptions={initialOptions}
      placeholder="Template"
      searchPlaceholder="Search templates"
      emptyMessage="No templates match"
      clearLabel="Clear filter"
      ariaLabel="Filter work orders by template"
    />
  )
}
