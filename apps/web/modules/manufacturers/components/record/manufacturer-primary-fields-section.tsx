"use client"

import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { TextCell } from "@/components/cells"
import { formatStableDateTime } from "@builders/domain"
import type { ManufacturerForm, ManufacturerRow } from "@builders/domain"

export function ManufacturerPrimaryFieldsSection({
  manufacturer,
  draft,
  disabled = false,
  onFieldChange,
}: {
  manufacturer: ManufacturerRow
  draft: ManufacturerForm
  disabled?: boolean
  onFieldChange: (field: keyof ManufacturerForm, value: string) => void
}) {
  const editable = !disabled
  const createdLabel = manufacturer.createdAt ? formatStableDateTime(manufacturer.createdAt) : "Not saved yet"
  const updatedLabel = manufacturer.updatedAt ? formatStableDateTime(manufacturer.updatedAt) : "Not saved yet"

  return (
    <FieldSection>
      <CellAt col={1} colSpan={4}>
        <FormField label="Company Name">
          <TextCell
            editable={editable}
            value={draft.companyName}
            onChange={(value) => onFieldChange("companyName", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="Agent Name">
          <TextCell
            editable={editable}
            value={draft.agentName}
            onChange={(value) => onFieldChange("agentName", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Website">
          <TextCell
            editable={editable}
            value={draft.website}
            onChange={(value) => onFieldChange("website", value)}
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
      <CellAt col={1} colSpan={2}>
        <FormField label="Products">
          <TextCell editable={false} value={String(manufacturer.productsCount)} />
        </FormField>
      </CellAt>
      <CellAt col={3} colSpan={3}>
        <FormField label="Created">
          <TextCell editable={false} value={createdLabel} />
        </FormField>
      </CellAt>
      <CellAt col={6} colSpan={3}>
        <FormField label="Updated">
          <TextCell editable={false} value={updatedLabel} />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
