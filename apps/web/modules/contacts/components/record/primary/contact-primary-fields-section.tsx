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
          {editable ? (
            <TextCell
              editable
              value={draft.name}
              onChange={(next) => onFieldChange("name", next)}
              placeholder="Contact name"
              ariaLabel="Contact name"
            />
          ) : (
            <StaticFieldValue>{draft.name || "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Phone">
          {editable ? (
            <TextCell
              editable
              value={draft.phone}
              onChange={(next) => onFieldChange("phone", next)}
              placeholder="Phone"
              ariaLabel="Contact phone"
            />
          ) : (
            <StaticFieldValue>{draft.phone || "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="Email">
          {editable ? (
            <TextCell
              editable
              value={draft.email}
              onChange={(next) => onFieldChange("email", next)}
              placeholder="Email"
              ariaLabel="Contact email"
            />
          ) : (
            <StaticFieldValue>{draft.email || "—"}</StaticFieldValue>
          )}
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
