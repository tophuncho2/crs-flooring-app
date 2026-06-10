"use client"

import { TextCell } from "@/engines/record-view"
import { FieldSection, FormField, StaticFieldValue } from "@/engines/record-view"
import { CellAt } from "@/engines/record-view"
import { formatEasternDateTime, type ContactForm } from "@builders/domain"

export type ContactPrimaryFieldsSectionProps = {
  draft: ContactForm
  editable: boolean
  onFieldChange: (field: keyof ContactForm, value: string) => void
  /** Read-only timestamps shown in the detail view; omit in the create flow. */
  createdAt?: string | null
  updatedAt?: string | null
}

export function ContactPrimaryFieldsSection({
  draft,
  editable,
  onFieldChange,
  createdAt,
  updatedAt,
}: ContactPrimaryFieldsSectionProps) {
  const showTimestamps = createdAt !== undefined || updatedAt !== undefined

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={8}>
        <FormField label="Name" required>
          <TextCell
            editable={editable}
            value={draft.name}
            onChange={(next) => onFieldChange("name", next)}
            placeholder="Contact name"
            ariaLabel="Contact name"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Phone">
          <TextCell
            editable={editable}
            value={draft.phone}
            onChange={(next) => onFieldChange("phone", next)}
            placeholder="Phone"
            ariaLabel="Contact phone"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="Email">
          <TextCell
            editable={editable}
            value={draft.email}
            onChange={(next) => onFieldChange("email", next)}
            placeholder="Email"
            ariaLabel="Contact email"
          />
        </FormField>
      </CellAt>
      {showTimestamps ? (
        <>
          <CellAt col={1} colSpan={4}>
            <FormField label="Created">
              <StaticFieldValue>{formatEasternDateTime(createdAt ?? null) || "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={5} colSpan={4}>
            <FormField label="Updated">
              <StaticFieldValue>{formatEasternDateTime(updatedAt ?? null) || "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
        </>
      ) : null}
    </FieldSection>
  )
}
