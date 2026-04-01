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
import { formatStableDateTime } from "@/modules/shared/domain/date-format"
import { CONTACT_TYPE_LABELS, CONTACT_TYPE_OPTIONS, type ContactDetail, type ContactForm } from "../../../domain/types"

export function ContactPrimaryFieldsSection({
  contact,
  draft,
  disabled = false,
  onFieldChange,
}: {
  contact: ContactDetail
  draft: ContactForm
  disabled?: boolean
  onFieldChange: (field: keyof ContactForm, value: string) => void
}) {
  const createdLabel = contact.createdAt ? formatStableDateTime(contact.createdAt) : "Not saved yet"
  const updatedLabel = contact.updatedAt ? formatStableDateTime(contact.updatedAt) : "Not saved yet"

  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="main">
        <RecordPrimaryFieldsGrid>
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Contact Name">
              <input
                value={draft.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Contact Type">
              <select
                value={draft.type}
                onChange={(event) => onFieldChange("type", event.target.value)}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              >
                <option value="">Select type</option>
                {CONTACT_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {CONTACT_TYPE_LABELS[option]}
                  </option>
                ))}
              </select>
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>

      <RecordPrimaryPane variant="side">
        <RecordPrimaryFieldsGrid variant="side">
          <RecordFormField label="Assignments">
            <RecordStaticFieldValue>{contact.assignmentsCount}</RecordStaticFieldValue>
          </RecordFormField>
          <RecordFormField label="Created">
            <RecordStaticFieldValue>{createdLabel}</RecordStaticFieldValue>
          </RecordFormField>
          <RecordFormField label="Updated">
            <RecordStaticFieldValue>{updatedLabel}</RecordStaticFieldValue>
          </RecordFormField>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>
    </RecordPrimarySection>
  )
}
