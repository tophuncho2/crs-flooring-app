"use client"

import { TextCell } from "@/engines/record-view"
import { FieldSection, FormField, StaticFieldValue } from "@/engines/record-view"
import { CellAt } from "@/engines/record-view"
import { formatEasternDateTime, type JobTypeForm } from "@builders/domain"

export type JobTypePrimaryFieldsSectionProps = {
  draft: JobTypeForm
  editable: boolean
  onFieldChange: (field: keyof JobTypeForm, value: string) => void
  /** Read-only JT-N number shown in the detail view; omit in the create flow (DB-generated). */
  jobTypeNumber?: string
  /** Read-only timestamps + actor emails shown in the detail view; omit in the create flow. */
  createdAt?: string | null
  updatedAt?: string | null
  createdBy?: string | null
  updatedBy?: string | null
}

export function JobTypePrimaryFieldsSection({
  draft,
  editable,
  onFieldChange,
  jobTypeNumber,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
}: JobTypePrimaryFieldsSectionProps) {
  const showTimestamps = createdAt !== undefined || updatedAt !== undefined

  return (
    <FieldSection gap="0.75rem">
      {jobTypeNumber ? (
        <CellAt col={1} colSpan={2}>
          <FormField label="JT #">
            <StaticFieldValue>{jobTypeNumber}</StaticFieldValue>
          </FormField>
        </CellAt>
      ) : null}
      <CellAt col={1} colSpan={2}>
        <FormField label="Name" required>
          <TextCell
            editable={editable}
            value={draft.name}
            onChange={(next) => onFieldChange("name", next)}
            placeholder="Job type name"
            ariaLabel="Job type name"
          />
        </FormField>
      </CellAt>
      {showTimestamps ? (
        <>
          <CellAt col={1} colSpan={2}>
            <FormField label="Created">
              <StaticFieldValue>{formatEasternDateTime(createdAt ?? null) || "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={2}>
            <FormField label="Updated">
              <StaticFieldValue>{formatEasternDateTime(updatedAt ?? null) || "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={2}>
            <FormField label="Created by">
              <StaticFieldValue>{createdBy ?? "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={2}>
            <FormField label="Updated by">
              <StaticFieldValue>{updatedBy ?? "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
        </>
      ) : null}
    </FieldSection>
  )
}
