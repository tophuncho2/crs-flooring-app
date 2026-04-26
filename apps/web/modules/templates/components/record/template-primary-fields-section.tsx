"use client"

import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { SelectCell, TextCell, TextareaCell } from "@/components/cells"
import type { TemplateForm } from "@builders/domain"

export type TemplateDropdownOption = { id: string; name: string }

export function TemplatePrimaryFieldsSection({
  draft,
  managementOptions,
  propertyOptions,
  jobTypeOptions,
  warehouseOptions,
  propertyLocked = false,
  managementCompanyLocked = false,
  disabled,
  onFieldChange,
}: {
  draft: TemplateForm
  managementOptions: TemplateDropdownOption[]
  propertyOptions: TemplateDropdownOption[]
  jobTypeOptions: TemplateDropdownOption[]
  warehouseOptions: TemplateDropdownOption[]
  propertyLocked?: boolean
  managementCompanyLocked?: boolean
  disabled: boolean
  onFieldChange: (field: keyof TemplateForm, value: string) => void
}) {
  const editable = !disabled

  return (
    <FieldSection>
      {/* Row 1: Management Company · Property · Job Type · Unit Type */}
      <CellAt col={1} row={1} colSpan={2}>
        <FormField label="Management Company">
          <SelectCell
            editable={editable && !managementCompanyLocked}
            value={draft.managementCompanyId}
            onChange={(value) => onFieldChange("managementCompanyId", value)}
            options={managementOptions.map((option) => ({ value: option.id, label: option.name }))}
            placeholder="No management company"
          />
        </FormField>
      </CellAt>
      <CellAt col={3} row={1} colSpan={2}>
        <FormField label="Property" required>
          <SelectCell
            editable={editable && !propertyLocked}
            value={draft.propertyId}
            onChange={(value) => onFieldChange("propertyId", value)}
            options={propertyOptions.map((option) => ({ value: option.id, label: option.name }))}
            placeholder="Select property"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} row={1} colSpan={2}>
        <FormField label="Job Type">
          <SelectCell
            editable={editable}
            value={draft.jobTypeId}
            onChange={(value) => onFieldChange("jobTypeId", value)}
            options={jobTypeOptions.map((option) => ({ value: option.id, label: option.name }))}
            placeholder="No job type"
          />
        </FormField>
      </CellAt>
      <CellAt col={7} row={1} colSpan={2}>
        <FormField label="Unit Type">
          <TextCell
            editable={editable}
            value={draft.unitType}
            onChange={(value) => onFieldChange("unitType", value)}
          />
        </FormField>
      </CellAt>

      {/* Row 2: Warehouse · Description */}
      <CellAt col={1} row={2} colSpan={2}>
        <FormField label="Warehouse">
          <SelectCell
            editable={editable}
            value={draft.warehouseId}
            onChange={(value) => onFieldChange("warehouseId", value)}
            options={warehouseOptions.map((option) => ({ value: option.id, label: option.name }))}
            placeholder="No warehouse"
          />
        </FormField>
      </CellAt>
      <CellAt col={3} row={2} colSpan={6}>
        <FormField label="Description">
          <TextCell
            editable={editable}
            value={draft.description}
            onChange={(value) => onFieldChange("description", value)}
          />
        </FormField>
      </CellAt>

      {/* Row 3: Instructions (full width) */}
      <CellAt col={1} row={3} colSpan={8}>
        <FormField label="Instructions">
          <TextareaCell
            editable={editable}
            value={draft.instructions}
            onChange={(value) => onFieldChange("instructions", value)}
            rows={3}
          />
        </FormField>
      </CellAt>

      {/* Row 4: Property Instructions (full width) */}
      <CellAt col={1} row={4} colSpan={8}>
        <FormField label="Property Instructions">
          <TextareaCell
            editable={editable}
            value={draft.propertyInstructions}
            onChange={(value) => onFieldChange("propertyInstructions", value)}
            rows={3}
          />
        </FormField>
      </CellAt>

      {/* Row 5: Template Notes (full width) */}
      <CellAt col={1} row={5} colSpan={8}>
        <FormField label="Template Notes">
          <TextareaCell
            editable={editable}
            value={draft.templateNotes}
            onChange={(value) => onFieldChange("templateNotes", value)}
            rows={3}
          />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
