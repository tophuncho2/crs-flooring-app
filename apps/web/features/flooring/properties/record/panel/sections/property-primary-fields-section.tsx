"use client"

import {
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RecordFormField,
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
  RecordStaticFieldValue,
} from "@/features/shared/engines/record-view"
import type { PropertyDetailRecord, PropertyPrimaryForm } from "../../../domain/types"

export function PropertyPrimaryFieldsSection({
  property,
  draft,
  managementOptions,
  disabled,
  onFieldChange,
}: {
  property: PropertyDetailRecord
  draft: PropertyPrimaryForm
  managementOptions: Array<{ id: string; name: string }>
  disabled: boolean
  onFieldChange: (field: keyof PropertyPrimaryForm, value: string) => void
}) {
  const fullAddress = [draft.streetAddress, draft.city, draft.state, draft.zip].filter(Boolean).join(", ")

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
                disabled={disabled}
              >
                <option value="">No management company</option>
                {managementOptions.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Phone">
              <input
                value={draft.phone}
                onChange={(event) => onFieldChange("phone", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Email">
              <input
                value={draft.email}
                onChange={(event) => onFieldChange("email", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>

      <RecordPrimaryPane variant="main" placement="right">
        <RecordPrimaryFieldsGrid>
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Property Name">
              <input
                value={draft.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="lg">
            <RecordFormField label="Street Address">
              <input
                value={draft.streetAddress}
                onChange={(event) => onFieldChange("streetAddress", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="City">
              <input
                value={draft.city}
                onChange={(event) => onFieldChange("city", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="State">
              <input
                value={draft.state}
                onChange={(event) => onFieldChange("state", event.target.value)}
                maxLength={2}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Zip">
              <input
                value={draft.zip}
                onChange={(event) => onFieldChange("zip", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="lg">
            <RecordFormField label="Full Address">
              <RecordStaticFieldValue wrap>
                {fullAddress || property.fullAddress || "Property address preview"}
              </RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>
    </RecordPrimarySection>
  )
}
