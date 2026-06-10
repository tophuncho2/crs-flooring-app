"use client"

import type { ManagementCompanyForm } from "@builders/domain"
import {
  AddressEditCell,
  CellAt,
  FieldSection,
  FormField,
  StaticFieldValue,
  TextCell,
} from "@/engines/record-view"

/**
 * A single labeled text field in the MC cells grid. Editable renders the live
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
 * The Management Company "cells" field grid — the shared §1 layout that renders
 * **identically** on the MC record view (editable, its own primary) and the
 * Property record view (read-only, the linked MC). Edit modality is the only
 * difference; pass `editable` + `onFieldChange` to drive it. The section shell
 * (title / save chrome) is supplied by the consumer.
 *
 * Layout: Company Name · Phone · Email · Address stacked one-per-row, each
 * spanning 6/8 columns (¾ width — a quarter narrower than the old full-width
 * address cell, which is now likewise 6/8).
 */
export function ManagementCompanyCellsSection({
  form,
  editable,
  onFieldChange,
}: {
  form: ManagementCompanyForm
  editable: boolean
  onFieldChange?: <K extends keyof ManagementCompanyForm>(
    field: K,
    value: ManagementCompanyForm[K],
  ) => void
}) {
  const onText =
    <K extends keyof ManagementCompanyForm>(field: K) =>
    (value: string) => {
      onFieldChange?.(field, value as ManagementCompanyForm[K])
    }

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={6}>
        <CellTextField
          label="Company Name"
          required
          editable={editable}
          value={form.name}
          onChange={onText("name")}
          placeholder="Company name"
          ariaLabel="Company name"
        />
      </CellAt>
      <CellAt col={1} colSpan={6}>
        <CellTextField
          label="Phone"
          editable={editable}
          value={form.phone}
          onChange={onText("phone")}
          placeholder="Phone"
          ariaLabel="Phone"
        />
      </CellAt>
      <CellAt col={1} colSpan={6}>
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
        colSpan={6}
        value={{
          streetAddress: form.streetAddress,
          city: form.city,
          state: form.state,
          zip: form.zip,
        }}
        onChange={(field, value) => onFieldChange?.(field, value)}
      />
    </FieldSection>
  )
}
