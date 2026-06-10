"use client"

import type { PropertyPrimaryForm } from "@builders/domain"
import { AddressEditCell, CellAt, FieldSection, FormField, TextCell, TextareaCell } from "@/engines/record-view"

/**
 * The Property record view's editable §1 fields: name, contact, address, and
 * instructions. The linked management company is **not** editable here — it is
 * shown read-only above this block with a hand-off to the MC record view (see
 * `PropertyRecordView`) — so the draft's `managementCompanyId` simply rides
 * along unchanged on save.
 */
export function PropertyFieldsSection({
  draft,
  editable,
  onFieldChange,
}: {
  draft: PropertyPrimaryForm
  editable: boolean
  onFieldChange: <K extends keyof PropertyPrimaryForm>(
    field: K,
    value: PropertyPrimaryForm[K],
  ) => void
}) {
  const onText =
    <K extends keyof PropertyPrimaryForm>(field: K) =>
    (value: string) => {
      onFieldChange(field, value as PropertyPrimaryForm[K])
    }

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={8}>
        <FormField label="Property Name" required>
          <TextCell
            editable={editable}
            value={draft.name}
            onChange={onText("name")}
            placeholder="Property name"
            ariaLabel="Property name"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Phone">
          <TextCell
            editable={editable}
            value={draft.phone}
            onChange={onText("phone")}
            placeholder="Phone"
            ariaLabel="Phone"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="Email">
          <TextCell
            editable={editable}
            value={draft.email}
            onChange={onText("email")}
            placeholder="Email"
            ariaLabel="Email"
          />
        </FormField>
      </CellAt>
      <AddressEditCell
        editable={editable}
        value={{
          streetAddress: draft.streetAddress,
          city: draft.city,
          state: draft.state,
          zip: draft.zip,
        }}
        onChange={(field, value) => onFieldChange(field, value)}
      />
      <CellAt col={1} colSpan={8}>
        <FormField label="Instructions">
          <TextareaCell
            editable={editable}
            value={draft.instructions}
            onChange={onText("instructions")}
            placeholder="Instructions"
            ariaLabel="Instructions"
            rows={3}
          />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
