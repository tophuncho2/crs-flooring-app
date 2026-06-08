"use client"

import type { ManagementCompanyOption, PropertyPrimaryForm } from "@builders/domain"
import { CellAt } from "@/engines/record-view"
import { FieldSection, FormField } from "@/engines/record-view"
import { TextCell, TextareaCell } from "@/engines/record-view"
import { AddressEditCell } from "../../address-edit-cell"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"

/**
 * Property "cells" — the §2 primary fields of the Property record view. Same
 * 8-col layout the hub used, plus an **editable Management Company picker** so
 * the property can be (re-)linked from inside the record view. The picker is
 * editable in every context; opened from the MC record view it simply arrives
 * pre-selected (the property already belongs to that MC) but stays changeable.
 */
export function PropertyPrimaryFieldsSection({
  draft,
  editable,
  onFieldChange,
  managementCompanyLabel,
  onManagementCompanyOption,
}: {
  draft: PropertyPrimaryForm
  editable: boolean
  onFieldChange: <K extends keyof PropertyPrimaryForm>(
    field: K,
    value: PropertyPrimaryForm[K],
  ) => void
  managementCompanyLabel: string | null
  onManagementCompanyOption: (option: ManagementCompanyOption | null) => void
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
      <CellAt col={1} colSpan={8}>
        <FormField label="Management Company">
          <ManagementCompanyPicker
            value={draft.managementCompanyId || null}
            onChange={(id) => onFieldChange("managementCompanyId", id ?? "")}
            onOptionSelected={onManagementCompanyOption}
            selectedLabel={managementCompanyLabel}
            disabled={!editable}
            placeholder="No management company"
            ariaLabel="Management company"
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
