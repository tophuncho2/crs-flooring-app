"use client"

import { TextCell } from "@/engines/record-view"
import { FieldSection, FormField, StaticFieldValue } from "@/engines/record-view"
import { CellAt } from "@/engines/record-view"
import { PaletteColorDropdown } from "@/engines/common"
import {
  formatEasternDateTime,
  type PaletteColor,
  type WorkOrderDocumentTypeForm,
  type WorkOrderStoredPrintConfig,
} from "@builders/domain"
import { PrintConfigChecklist } from "@/modules/work-orders/components/record/print/print-config-checklist"

export type WorkOrderDocumentTypePrimaryFieldsSectionProps = {
  draft: WorkOrderDocumentTypeForm
  editable: boolean
  onNameChange: (value: string) => void
  onColorChange: (value: PaletteColor) => void
  onPrintConfigChange: (next: WorkOrderStoredPrintConfig) => void
  /** Read-only ROW-N number shown in the detail view; omit in the create flow (DB-generated). */
  workOrderDocumentTypeNumber?: string
  /** Read-only timestamps + actor emails shown in the detail view; omit in the create flow. */
  createdAt?: string | null
  updatedAt?: string | null
  createdBy?: string | null
  updatedBy?: string | null
}

export function WorkOrderDocumentTypePrimaryFieldsSection({
  draft,
  editable,
  onNameChange,
  onColorChange,
  onPrintConfigChange,
  workOrderDocumentTypeNumber,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
}: WorkOrderDocumentTypePrimaryFieldsSectionProps) {
  const showTimestamps = createdAt !== undefined || updatedAt !== undefined

  return (
    <FieldSection gap="0.75rem">
      {workOrderDocumentTypeNumber ? (
        <CellAt col={1} colSpan={2}>
          <FormField label="ROW #">
            <StaticFieldValue>{workOrderDocumentTypeNumber}</StaticFieldValue>
          </FormField>
        </CellAt>
      ) : null}
      <CellAt col={1} colSpan={2}>
        <FormField label="Name" required>
          <TextCell
            editable={editable}
            value={draft.name}
            onChange={(next) => onNameChange(next)}
            placeholder="Document type"
            ariaLabel="Document type name"
            maxLength={40}
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={2}>
        <FormField label="Color" required>
          <PaletteColorDropdown
            value={draft.color}
            editable={editable}
            onChange={onColorChange}
            ariaLabel="Document type color"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={2}>
        <FormField label="Print defaults">
          <PrintConfigChecklist
            value={draft.printConfig}
            editable={editable}
            onChange={onPrintConfigChange}
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
