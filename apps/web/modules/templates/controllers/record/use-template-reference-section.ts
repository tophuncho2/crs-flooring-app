"use client"

import {
  useCascadePickerController,
  type CascadePickerController,
} from "@/engines/picker"

export type TemplateReferenceSectionController = {
  cascade: CascadePickerController
}

/**
 * Controller for the shared templates reference section consumed by the MC and
 * property record views. It seeds the shared cascade picker with the host scope
 * (a management company when the host has one — null for an orphan property;
 * optionally a property when the property record view fixes one) and returns it —
 * the section's MC/Property pickers drive the grid filter, and clicking a template
 * row routes straight to the template hub.
 *
 * Selectability (which seeded pickers the operator may change) and the Clear
 * semantics live in the consuming component. There is no selected-template
 * state here: the section navigates on row click rather than previewing.
 */
export function useTemplateReferenceSection({
  managementCompanyId,
  managementCompanyLabel,
  propertyId = null,
  propertyLabel = null,
}: {
  managementCompanyId: string | null
  managementCompanyLabel: string | null
  propertyId?: string | null
  propertyLabel?: string | null
}): TemplateReferenceSectionController {
  const cascade = useCascadePickerController({
    initialSelections: {
      managementCompanyId,
      managementCompanyLabel,
      propertyId,
      propertyLabel,
    },
  })

  return { cascade }
}
