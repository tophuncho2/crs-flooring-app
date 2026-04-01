"use client"

import {
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RecordFormField,
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
  RecordStaticFieldValue,
} from "@/modules/shared/engines/record-view"
import type { ManagementCompanyDetail, ManagementCompanyForm } from "../../../domain/types"

export function ManagementCompanyPrimaryFieldsSection({
  company,
  draft,
  disabled = false,
  onFieldChange,
}: {
  company: ManagementCompanyDetail
  draft: ManagementCompanyForm
  disabled?: boolean
  onFieldChange: (field: keyof ManagementCompanyForm, value: string) => void
}) {
  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="main">
        <RecordPrimaryFieldsGrid>
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Company Name">
              <input
                value={draft.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="lg">
            <RecordFormField label="Street Address">
              <input
                value={draft.streetAddress}
                onChange={(event) => onFieldChange("streetAddress", event.target.value)}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="City">
              <input
                value={draft.city}
                onChange={(event) => onFieldChange("city", event.target.value)}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="State">
              <input
                value={draft.state}
                onChange={(event) => onFieldChange("state", event.target.value)}
                maxLength={2}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Zip">
              <input
                value={draft.zip}
                onChange={(event) => onFieldChange("zip", event.target.value)}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="lg">
            <RecordFormField label="Full Address">
              <RecordStaticFieldValue size="lg">{company.fullAddress || "Management company address preview"}</RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>

      <RecordPrimaryPane variant="side">
        <RecordPrimaryFieldsGrid variant="side">
          <RecordFormField label="Phone">
            <input
              value={draft.phone}
              onChange={(event) => onFieldChange("phone", event.target.value)}
              disabled={disabled}
              className={RECORD_FIELD_CONTROL_CLASS_NAME}
            />
          </RecordFormField>
          <RecordFormField label="Email">
            <input
              value={draft.email}
              onChange={(event) => onFieldChange("email", event.target.value)}
              disabled={disabled}
              className={RECORD_FIELD_CONTROL_CLASS_NAME}
            />
          </RecordFormField>
          <RecordFormField label="Linked Properties">
            <RecordStaticFieldValue>{company.properties.length}</RecordStaticFieldValue>
          </RecordFormField>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>
    </RecordPrimarySection>
  )
}
