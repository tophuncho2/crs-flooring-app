"use client"

import {
  useCascadePickerController,
  type CascadePickerController,
} from "@/engines/picker"

export type TemplatesSectionScopeController = {
  cascade: CascadePickerController
}

/**
 * Scope controller for the shared templates record-view section consumed by the
 * entity and property record views. It seeds the shared cascade picker with the host
 * scope (a entity when the host has one — null for an orphan property;
 * optionally a property when the property record view fixes one) and returns it —
 * the section's entity/Property pickers drive the table filter, and clicking a template
 * row routes straight to the template hub.
 *
 * Selectability (which seeded pickers the operator may change) and the Clear
 * semantics live in the consuming section component. There is no selected-template
 * state here: the section navigates on row click rather than previewing.
 */
export function useTemplatesSectionScope({
  entityId,
  entityLabel,
  propertyId = null,
  propertyLabel = null,
}: {
  entityId: string | null
  entityLabel: string | null
  propertyId?: string | null
  propertyLabel?: string | null
}): TemplatesSectionScopeController {
  const cascade = useCascadePickerController({
    initialSelections: {
      entityId,
      entityLabel,
      propertyId,
      propertyLabel,
    },
  })

  return { cascade }
}
