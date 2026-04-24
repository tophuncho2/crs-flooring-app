"use client"

import {
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RecordFormField,
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
} from "@/modules/shared/engines/record-view"
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
  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="side" placement="left">
        <RecordPrimaryFieldsGrid variant="side">
          <RecordPrimaryFieldCell>
            <RecordFormField label="Management Company">
              <select
                value={draft.managementCompanyId}
                onChange={(event) => onFieldChange("managementCompanyId", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled || managementCompanyLocked}
              >
                <option value="">No management company</option>
                {managementOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Property">
              <select
                value={draft.propertyId}
                onChange={(event) => onFieldChange("propertyId", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled || propertyLocked}
              >
                <option value="">Select property</option>
                {propertyOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Job Type">
              <select
                value={draft.jobTypeId}
                onChange={(event) => onFieldChange("jobTypeId", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              >
                <option value="">No job type</option>
                {jobTypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Unit Type">
              <input
                value={draft.unitType}
                onChange={(event) => onFieldChange("unitType", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Warehouse">
              <select
                value={draft.warehouseId}
                onChange={(event) => onFieldChange("warehouseId", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              >
                <option value="">No warehouse</option>
                {warehouseOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>

      <RecordPrimaryPane variant="main" placement="right">
        <RecordPrimaryFieldsGrid>
          <RecordPrimaryFieldCell size="lg">
            <RecordFormField label="Description">
              <input
                value={draft.description}
                onChange={(event) => onFieldChange("description", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="lg">
            <RecordFormField label="Instructions">
              <textarea
                value={draft.instructions}
                onChange={(event) => onFieldChange("instructions", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
                rows={3}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="lg">
            <RecordFormField label="Property Instructions">
              <textarea
                value={draft.propertyInstructions}
                onChange={(event) => onFieldChange("propertyInstructions", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
                rows={3}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="lg">
            <RecordFormField label="Template Notes">
              <textarea
                value={draft.templateNotes}
                onChange={(event) => onFieldChange("templateNotes", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
                rows={3}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>
    </RecordPrimarySection>
  )
}
