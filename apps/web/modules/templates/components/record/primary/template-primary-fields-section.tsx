"use client"

import { useState } from "react"
import {
  CellAt,
  FieldSection,
  FormField,
  StaticFieldValue,
  TextareaCell,
} from "@/engines/record-view"
import { JobTypePicker } from "@/modules/job-types/components/picker/job-type-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import {
  TEMPLATE_DESCRIPTION_MAX,
  TEMPLATE_INTERNAL_NOTES_MAX,
  type TemplateForm,
} from "@builders/domain"
import { usePropertyJoinedOverride } from "@/modules/templates/controllers/record/primary/use-property-joined-override"
import { TemplatePropertyUnitGroup } from "./groups/template-property-unit-group"

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
 * Composer for the templates primary section. Renders every field on the
 * record-view engine's invisible grid (`FieldSection` + `CellAt` + `FormField`),
 * single-column stacked — half-width controls up top, full-width read-only
 * property fields + textareas below. The former tab-card groups are gone; the
 * MC / Property / + New property nav buttons moved to the header Options menu.
 */
export function TemplatePrimaryFieldsSection({
  draft,
  detail,
  disabled,
  onFieldChange,
  onFieldsChange,
}: {
  draft: TemplateForm
  detail: TemplatePrimaryDetail | null
  disabled: boolean
  onFieldChange: (field: keyof TemplateForm, value: string) => void
  /** Multi-field setter — used by the property-unit cluster for the MC→Property cascade. */
  onFieldsChange: (patch: Partial<TemplateForm>) => void
}) {
  const editable = !disabled
  const { propertyJoined, handlePropertyOption } = usePropertyJoinedOverride(detail)

  // Snapshot the picked job-type label so it survives the dropdown preferring
  // `selectedOption` over its live results; falls back to the saved joined name.
  const [pickedJobTypeLabel, setPickedJobTypeLabel] = useState<string | null>(null)
  const jobTypeLabel = pickedJobTypeLabel ?? detail?.jobTypeName ?? null

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={4}>
        <FormField label="Warehouse">
          {editable ? (
            <WarehousePicker
              value={draft.warehouseId || null}
              onChange={(id) => onFieldChange("warehouseId", id ?? "")}
              selectedLabel={detail?.warehouseName || null}
              placeholder="No warehouse"
              ariaLabel="Warehouse"
            />
          ) : (
            <StaticFieldValue>{detail?.warehouseName || "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Job Type">
          {editable ? (
            <JobTypePicker
              value={draft.jobTypeId || null}
              onChange={(id) => onFieldChange("jobTypeId", id ?? "")}
              onOptionSelected={(option) => setPickedJobTypeLabel(option?.name ?? null)}
              selectedLabel={jobTypeLabel}
              placeholder="No job type"
              ariaLabel="Job type"
            />
          ) : (
            <StaticFieldValue>{jobTypeLabel ?? "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField
          label="Description"
          currentLength={editable ? draft.description.length : undefined}
          maxLength={editable ? TEMPLATE_DESCRIPTION_MAX : undefined}
        >
          <TextareaCell
            editable={editable}
            value={draft.description}
            onChange={(value) => onFieldChange("description", value)}
            maxLength={TEMPLATE_DESCRIPTION_MAX}
          />
        </FormField>
      </CellAt>

      <TemplatePropertyUnitGroup
        editable={editable}
        draft={draft}
        detail={detail}
        propertyJoined={draft.propertyId ? propertyJoined : null}
        onFieldChange={onFieldChange}
        onFieldsChange={onFieldsChange}
        onPropertyOption={handlePropertyOption}
      />

      <CellAt col={1} colSpan={8}>
        <FormField
          label="Internal Notes"
          currentLength={editable ? draft.internalNotes.length : undefined}
          maxLength={editable ? TEMPLATE_INTERNAL_NOTES_MAX : undefined}
        >
          <TextareaCell
            editable={editable}
            value={draft.internalNotes}
            onChange={(value) => onFieldChange("internalNotes", value)}
            maxLength={TEMPLATE_INTERNAL_NOTES_MAX}
            rows={4}
          />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
