"use client"

import type { ManagementCompanyForm } from "@builders/domain"
import { CellAt } from "@/engines/record-view"
import { FieldSection, FormField } from "@/engines/record-view"
import { TextCell } from "@/engines/record-view"
import { AddressEditCell } from "../address-edit-cell"

/**
 * The Management Company "cells" field grid — the shared §1 layout that renders
 * **identically** on the MC record view (editable, its own primary) and the
 * Property record view (read-only, the linked MC). Edit modality is the only
 * difference; pass `editable` + `onFieldChange` to drive it. The section shell
 * (title / save chrome) is supplied by the consumer.
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
      <CellAt col={1} colSpan={8}>
        <FormField label="Company Name" required>
          <TextCell
            editable={editable}
            value={form.name}
            onChange={onText("name")}
            placeholder="Company name"
            ariaLabel="Company name"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Phone">
          <TextCell
            editable={editable}
            value={form.phone}
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
            value={form.email}
            onChange={onText("email")}
            placeholder="Email"
            ariaLabel="Email"
          />
        </FormField>
      </CellAt>
      <AddressEditCell
        editable={editable}
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
