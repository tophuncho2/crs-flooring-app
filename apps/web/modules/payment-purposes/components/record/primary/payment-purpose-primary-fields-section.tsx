"use client"

import { TextCell } from "@/engines/record-view"
import { FieldSection, FormField, StaticFieldValue } from "@/engines/record-view"
import { CellAt } from "@/engines/record-view"
import { PaletteColorDropdown } from "@/engines/common"
import { formatEasternDateTime, type PaletteColor, type PaymentPurposeForm } from "@builders/domain"

export type PaymentPurposePrimaryFieldsSectionProps = {
  draft: PaymentPurposeForm
  editable: boolean
  onNameChange: (value: string) => void
  onColorChange: (value: PaletteColor) => void
  /** Read-only ROW-N number shown in the detail view; omit in the create flow (DB-generated). */
  paymentPurposeNumber?: string
  /** Read-only timestamps + actor emails shown in the detail view; omit in the create flow. */
  createdAt?: string | null
  updatedAt?: string | null
  createdBy?: string | null
  updatedBy?: string | null
}

export function PaymentPurposePrimaryFieldsSection({
  draft,
  editable,
  onNameChange,
  onColorChange,
  paymentPurposeNumber,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
}: PaymentPurposePrimaryFieldsSectionProps) {
  const showTimestamps = createdAt !== undefined || updatedAt !== undefined

  return (
    <FieldSection gap="0.75rem">
      {paymentPurposeNumber ? (
        <CellAt col={1} colSpan={2}>
          <FormField label="ROW #">
            <StaticFieldValue>{paymentPurposeNumber}</StaticFieldValue>
          </FormField>
        </CellAt>
      ) : null}
      <CellAt col={1} colSpan={2}>
        <FormField label="Name" required>
          <TextCell
            editable={editable}
            value={draft.name}
            onChange={(next) => onNameChange(next)}
            placeholder="Payment purpose"
            ariaLabel="Payment purpose name"
            maxLength={30}
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={2}>
        <FormField label="Color" required>
          <PaletteColorDropdown
            value={draft.color}
            editable={editable}
            onChange={onColorChange}
            ariaLabel="Payment purpose color"
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
