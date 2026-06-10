"use client"

import { useState } from "react"
import { NumberCell, TextCell } from "@/engines/record-view"
import { FieldSection, FormField, StaticFieldValue } from "@/engines/record-view"
import { CellAt } from "@/engines/record-view"
import { formatEasternDateTime, type LaborPaymentForm } from "@builders/domain"
import { ContactPicker } from "@/modules/contacts/components/picker/contact-picker"

export type LaborPaymentPrimaryFieldsSectionProps = {
  draft: LaborPaymentForm
  editable: boolean
  onFieldChange: (field: keyof LaborPaymentForm, value: string) => void
  /** Saved contact name, used as the picker's selected label in the detail view. */
  contactName?: string | null
  /** Read-only timestamps shown in the detail view; omit in the create flow. */
  createdAt?: string | null
  updatedAt?: string | null
}

export function LaborPaymentPrimaryFieldsSection({
  draft,
  editable,
  onFieldChange,
  contactName,
  createdAt,
  updatedAt,
}: LaborPaymentPrimaryFieldsSectionProps) {
  const showTimestamps = createdAt !== undefined || updatedAt !== undefined

  // Local label snapshot so the picker trigger shows the just-picked contact
  // immediately, before the section save reconciles a fresh record. Resets at
  // render time when the bound contactId changes — mirrors the work-order pickers.
  const [pickedContactLabel, setPickedContactLabel] = useState<string | null>(null)
  const [trackedContactId, setTrackedContactId] = useState(draft.contactId)
  if (trackedContactId !== draft.contactId && contactName !== undefined) {
    setTrackedContactId(draft.contactId)
    setPickedContactLabel(null)
  }

  const contactLabel = pickedContactLabel ?? contactName ?? null

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={8}>
        <FormField label="Contact" required>
          <ContactPicker
            value={draft.contactId || null}
            onChange={(id) => onFieldChange("contactId", id ?? "")}
            onOptionSelected={(option) => setPickedContactLabel(option?.name ?? null)}
            selectedLabel={contactLabel}
            disabled={!editable}
            placeholder="Select a contact"
            ariaLabel="Contact"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Unit">
          <TextCell
            editable={editable}
            value={draft.unit}
            onChange={(next) => onFieldChange("unit", next)}
            placeholder="Room / area"
            ariaLabel="Unit"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="Cost">
          <NumberCell
            editable={editable}
            value={draft.cost}
            onChange={(next) => onFieldChange("cost", next)}
            maxDecimals={2}
            prefix="$"
            ariaLabel="Cost"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField label="Description">
          <TextCell
            editable={editable}
            value={draft.description}
            onChange={(next) => onFieldChange("description", next)}
            placeholder="Description"
            ariaLabel="Description"
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
