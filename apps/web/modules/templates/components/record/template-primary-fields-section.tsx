"use client"

import type { TemplateForm } from "@builders/domain"
import { TemplateJobGroup } from "./groups/template-job-group"
import { TemplateNotesGroup } from "./groups/template-notes-group"
import { TemplatePropertyUnitGroup } from "./groups/template-property-unit-group"
import { usePropertyJoinedOverride } from "./use-property-joined-override"

/**
 * Slim joined-name + joined-property snapshot the section needs from
 * the saved template. Drives read-only label rendering and seeds the
 * pickers' `selectedLabel` so the trigger shows the saved selection
 * without a server round-trip. Pass `null` from create flows.
 */
export type TemplatePrimaryDetail = {
  propertyId: string
  propertyName: string
  propertyStreetAddress: string
  propertyCity: string
  propertyState: string
  propertyPostalCode: string
  propertyInstructions: string
  managementCompanyId: string | null
  managementCompanyName: string | null
  jobTypeId: string | null
  jobTypeName: string | null
  warehouseId: string | null
  warehouseName: string
}

/**
 * Composer for the templates primary section. Renders three visual
 * groups in order — Job, Property & Unit, Notes — each with a
 * tab-style header matching the WO record view. Pure UI orchestration;
 * the `draft` / `onFieldChange` interface is unchanged from the prior
 * monolithic `FieldSection` composition.
 */
export function TemplatePrimaryFieldsSection({
  draft,
  detail,
  disabled,
  onFieldChange,
}: {
  draft: TemplateForm
  detail: TemplatePrimaryDetail | null
  disabled: boolean
  onFieldChange: (field: keyof TemplateForm, value: string) => void
}) {
  const editable = !disabled
  const { propertyJoined, handlePropertyOption } = usePropertyJoinedOverride(detail)

  return (
    <div className="flex flex-col gap-4">
      <TemplateJobGroup
        editable={editable}
        draft={draft}
        detail={detail}
        onFieldChange={onFieldChange}
      />
      <TemplatePropertyUnitGroup
        editable={editable}
        draft={draft}
        detail={detail}
        propertyJoined={draft.propertyId ? propertyJoined : null}
        onFieldChange={onFieldChange}
        onPropertyOption={handlePropertyOption}
      />
      <TemplateNotesGroup
        editable={editable}
        draft={draft}
        onFieldChange={onFieldChange}
      />
    </div>
  )
}
