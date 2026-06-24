"use client"

import { formatPhoneNumber, type EntityForm } from "@builders/domain"
import {
  AddressEditCell,
  CellAt,
  FieldSection,
  FormField,
  PhoneCell,
  StaticFieldValue,
  TextCell,
} from "@/engines/record-view"

/**
 * A single labeled text field in the entity cells grid. Editable renders the live
 * `TextCell` input; read-only renders the boxed `StaticFieldValue` so the value
 * reads as a filled cell (matching the Address cell and the app-wide read-only
 * convention) rather than a bare line of text.
 */
function CellTextField({
  label,
  required,
  editable,
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  label: string
  required?: boolean
  editable: boolean
  value: string
  onChange: (value: string) => void
  placeholder: string
  ariaLabel: string
}) {
  return (
    <FormField label={label} required={required}>
      {editable ? (
        <TextCell
          editable
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          ariaLabel={ariaLabel}
        />
      ) : (
        <StaticFieldValue>{value || "—"}</StaticFieldValue>
      )}
    </FormField>
  )
}

/**
 * The Entity "cells" field grid — the shared §1 layout that renders
 * **identically** on the entity record view (editable, its own primary) and the
 * Property record view (read-only, the linked entity). Edit modality is the only
 * difference; pass `editable` + `onFieldChange` to drive it. The section shell
 * (title / save chrome) is supplied by the consumer.
 *
 * Layout: Entity Name · Phone · Email · Address stacked one-per-row, each
 * spanning 5/8 columns (address cell included).
 */
export function EntityCellsSection({
  form,
  editable,
  onFieldChange,
  showContactAndAddress = true,
}: {
  form: EntityForm
  editable: boolean
  onFieldChange?: <K extends keyof EntityForm>(
    field: K,
    value: EntityForm[K],
  ) => void
  /**
   * Render the Phone, Email, and Address cells. Default `true` (full form). The
   * quick-create modal passes `false` to trim the "create new entity" cells down to
   * Entity Name only.
   */
  showContactAndAddress?: boolean
}) {
  const onText =
    <K extends keyof EntityForm>(field: K) =>
    (value: string) => {
      onFieldChange?.(field, value as EntityForm[K])
    }

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={5}>
        <CellTextField
          label="Entity Name"
          required
          editable={editable}
          value={form.entity}
          onChange={onText("entity")}
          placeholder="Entity name"
          ariaLabel="Entity name"
        />
      </CellAt>
      {showContactAndAddress ? (
        <>
          <CellAt col={1} colSpan={5}>
            <FormField label="Phone">
              {editable ? (
                <PhoneCell
                  editable
                  value={form.phone}
                  onChange={onText("phone")}
                  ariaLabel="Phone"
                />
              ) : (
                <StaticFieldValue>{formatPhoneNumber(form.phone) || "—"}</StaticFieldValue>
              )}
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={5}>
            <CellTextField
              label="Email"
              editable={editable}
              value={form.email}
              onChange={onText("email")}
              placeholder="Email"
              ariaLabel="Email"
            />
          </CellAt>
          <AddressEditCell
            editable={editable}
            colSpan={5}
            value={{
              streetAddress: form.streetAddress,
              city: form.city,
              state: form.state,
              zip: form.zip,
            }}
            onChange={(field, value) => onFieldChange?.(field, value)}
          />
        </>
      ) : null}
    </FieldSection>
  )
}
