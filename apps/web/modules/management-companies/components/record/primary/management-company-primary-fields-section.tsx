"use client"

import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { TextCell } from "@/components/cells"
import type { ManagementCompanyDetail, ManagementCompanyForm } from "@builders/domain"

export function ManagementCompanyPrimaryFieldsSection({
  company,
  draft,
  disabled = false,
  onFieldChange,
}: {
  company: ManagementCompanyDetail
  draft: ManagementCompanyForm
  disabled?: boolean
  onFieldChange: (field: keyof ManagementCompanyForm, value: string) => void
}) {
  const editable = !disabled

  return (
    <FieldSection>
      <CellAt col={1} colSpan={4}>
        <FormField label="Company Name">
          <TextCell
            editable={editable}
            value={draft.name}
            onChange={(value) => onFieldChange("name", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={2}>
        <FormField label="Phone">
          <TextCell
            editable={editable}
            value={draft.phone}
            onChange={(value) => onFieldChange("phone", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={7} colSpan={2}>
        <FormField label="Email">
          <TextCell
            editable={editable}
            value={draft.email}
            onChange={(value) => onFieldChange("email", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField label="Street Address">
          <TextCell
            editable={editable}
            value={draft.streetAddress}
            onChange={(value) => onFieldChange("streetAddress", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={3}>
        <FormField label="City">
          <TextCell
            editable={editable}
            value={draft.city}
            onChange={(value) => onFieldChange("city", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={4} colSpan={2}>
        <FormField label="State">
          <TextCell
            editable={editable}
            value={draft.state}
            onChange={(value) => onFieldChange("state", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={6} colSpan={3}>
        <FormField label="Zip">
          <TextCell
            editable={editable}
            value={draft.zip}
            onChange={(value) => onFieldChange("zip", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField label="Full Address">
          <TextCell editable={false} value={company.fullAddress || "Management company address preview"} />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
