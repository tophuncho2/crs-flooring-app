"use client"

import {
  CellAt,
  FieldSection,
  FormField,
  RecordColumnBreak,
  RecordSectionDivider,
  StatCell,
  StaticFieldValue,
  TextCell,
} from "@/engines/record-view"
import { formatEasternDateTime, type JobTypeForm, type JobTypeStats } from "@builders/domain"

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
  /** Linked-row counts shown in the detail view's right flank; omit in the create flow. */
  stats?: JobTypeStats
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
  stats,
}: JobTypePrimaryFieldsSectionProps) {
  const showTimestamps = createdAt !== undefined || updatedAt !== undefined

  // The editable cluster is shared by both flows; the create flow stays a single
  // narrow column (span 2), while the detail flow's left flank fills its column (span 8).
  const renderEditableFields = (span: number) => (
    <>
      {jobTypeNumber ? (
        <CellAt col={1} colSpan={span}>
          <FormField label="JT #">
            <StaticFieldValue>{jobTypeNumber}</StaticFieldValue>
          </FormField>
        </CellAt>
      ) : null}
      <CellAt col={1} colSpan={span}>
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
    </>
  )

  // Create flow: no stats / no summary — keep the original single-column form.
  if (!showTimestamps) {
    return <FieldSection gap="0.75rem">{renderEditableFields(2)}</FieldSection>
  }

  // Detail flow: editable fields left, linked-row counts stacked right, then a
  // divider over the read-only snapshot + actor metadata band.
  return (
    <div className="flex flex-col gap-4">
      <RecordColumnBreak
        split="right-narrow"
        left={<FieldSection gap="0.75rem">{renderEditableFields(8)}</FieldSection>}
        right={
          <FieldSection gap="0.75rem">
            <CellAt col={1} colSpan={8}>
              <FormField label="Templates">
                <StatCell value={stats?.templatesCount ?? 0} ariaLabel="Linked templates total" />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Work Orders">
                <StatCell
                  value={stats?.workOrdersCount ?? 0}
                  ariaLabel="Linked work orders total"
                />
              </FormField>
            </CellAt>
          </FieldSection>
        }
      />
      <RecordSectionDivider />
      <FieldSection gap="0.75rem">
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
        <CellAt col={1} colSpan={4}>
          <FormField label="Created by">
            <StaticFieldValue>{createdBy ?? "—"}</StaticFieldValue>
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={4}>
          <FormField label="Updated by">
            <StaticFieldValue>{updatedBy ?? "—"}</StaticFieldValue>
          </FormField>
        </CellAt>
      </FieldSection>
    </div>
  )
}
