"use client"

import {
  CellAt,
  DateCell,
  FieldSection,
  FormField,
  RecordColumnBreak,
  RecordOpenButton,
  RecordSectionDivider,
  StaticFieldValue,
  TextCell,
  TextareaCell,
} from "@/engines/record-view"
import { CellAddButton, CellChip } from "@/engines/common"
import {
  CERTIFICATE_NOTES_MAX_LENGTH,
  formatEasternDateTime,
  type CertificatePrimaryForm,
  type CertificateStatus,
  type EntityOption,
} from "@builders/domain"
import { EntityTypePicker } from "@/modules/entities/components/picker/entity-type-picker"

/** Entity-picker wiring — the parent holds the picked-label state (picker contract). */
export type CertificateEntityPicker = {
  value: string | null
  selectedLabel: string | null
  onChange: (id: string | null) => void
  onOptionSelected: (option: EntityOption | null) => void
  onOpen: () => void
  onCreate: () => void
  initialOptions?: EntityOption[]
}

export type CertificatePrimaryFieldsSectionProps = {
  draft: CertificatePrimaryForm
  editable: boolean
  onFieldChange: (field: keyof CertificatePrimaryForm, value: string) => void
  entity: CertificateEntityPicker
  /** Read-time expiration status chip — detail flow only. */
  status?: CertificateStatus
  /** Read-only timestamps + actor emails shown in the detail view; omit in the create flow. */
  createdAt?: string | null
  updatedAt?: string | null
  createdBy?: string | null
  updatedBy?: string | null
}

export function CertificatePrimaryFieldsSection({
  draft,
  editable,
  onFieldChange,
  entity,
  status,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
}: CertificatePrimaryFieldsSectionProps) {
  const showDetail = createdAt !== undefined || updatedAt !== undefined

  // Column span widens in the detail flow (fills its flank) vs the narrower create form.
  const renderEditableFields = (span: number) => (
    <>
      <CellAt col={1} colSpan={span}>
        <FormField label="Certificate Name" required>
          <TextCell
            editable={editable}
            value={draft.name}
            onChange={(next) => onFieldChange("name", next)}
            placeholder="Certificate name"
            ariaLabel="Certificate name"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={span}>
        <FormField
          label="Entity"
          actions={
            <>
              <RecordOpenButton
                ariaLabel="Open entity"
                title="Open entity"
                disabled={!entity.value}
                onClick={entity.onOpen}
              />
              {editable ? (
                <CellAddButton ariaLabel="New entity" title="New entity" onClick={entity.onCreate} />
              ) : null}
            </>
          }
        >
          <EntityTypePicker
            value={entity.value}
            onChange={entity.onChange}
            onOptionSelected={entity.onOptionSelected}
            selectedLabel={entity.selectedLabel}
            placeholder="Select entity"
            ariaLabel="Entity"
            disabled={!editable}
            initialOptions={entity.initialOptions}
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={span}>
        <FormField label="Expiration Date">
          <DateCell
            editable={editable}
            value={draft.expirationDate}
            onChange={(next) => onFieldChange("expirationDate", next)}
            ariaLabel="Expiration date"
          />
        </FormField>
      </CellAt>
      {status ? (
        <CellAt col={1} colSpan={span}>
          <FormField label="Status">
            <CellChip tone={status.tone}>{status.label}</CellChip>
          </FormField>
        </CellAt>
      ) : null}
      <CellAt col={1} colSpan={span}>
        <FormField label="Internal Notes">
          <TextareaCell
            editable={editable}
            value={draft.internalNotes}
            onChange={(next) => onFieldChange("internalNotes", next)}
            placeholder="Internal notes"
            ariaLabel="Internal notes"
            rows={3}
            maxLength={CERTIFICATE_NOTES_MAX_LENGTH}
          />
        </FormField>
      </CellAt>
    </>
  )

  // Create flow: no status / no metadata band — a single narrow column.
  if (!showDetail) {
    return <FieldSection gap="0.75rem">{renderEditableFields(4)}</FieldSection>
  }

  // Detail flow: editable fields, then a divider over the read-only snapshot +
  // actor metadata band.
  return (
    <div className="flex flex-col gap-4">
      <RecordColumnBreak
        left={<FieldSection gap="0.75rem">{renderEditableFields(8)}</FieldSection>}
        right={null}
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
