"use client"

import { formatEasternDateTime, type ManufacturerForm } from "@builders/domain"
import { TextCell } from "@/components/cells"
import { FieldSection, FormField, StaticFieldValue } from "@/components/fields"
import { CellAt } from "@/components/layout-grid"

export type ManufacturerPrimaryFieldsSectionProps = {
  draft: ManufacturerForm
  editable: boolean
  onFieldChange: (field: keyof ManufacturerForm, value: string) => void
  /** Read-only summary shown in the detail view; omit in the create flow. */
  productsCount?: number
  createdAt?: string
  updatedAt?: string
}

export function ManufacturerPrimaryFieldsSection({
  draft,
  editable,
  onFieldChange,
  productsCount,
  createdAt,
  updatedAt,
}: ManufacturerPrimaryFieldsSectionProps) {
  const showSummary = productsCount !== undefined

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={8}>
        <FormField label="Company Name">
          <TextCell
            editable={editable}
            value={draft.companyName}
            onChange={(next) => onFieldChange("companyName", next)}
            placeholder="Company"
            ariaLabel="Manufacturer company name"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField label="Agent Name">
          <TextCell
            editable={editable}
            value={draft.agentName}
            onChange={(next) => onFieldChange("agentName", next)}
            placeholder="Agent"
            ariaLabel="Manufacturer agent name"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField label="Email">
          <TextCell
            editable={editable}
            value={draft.email}
            onChange={(next) => onFieldChange("email", next)}
            placeholder="Email"
            ariaLabel="Manufacturer email"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField label="Phone">
          <TextCell
            editable={editable}
            value={draft.phone}
            onChange={(next) => onFieldChange("phone", next)}
            placeholder="Phone"
            ariaLabel="Manufacturer phone"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField label="Website">
          <TextCell
            editable={editable}
            value={draft.website}
            onChange={(next) => onFieldChange("website", next)}
            placeholder="https://"
            ariaLabel="Manufacturer website"
          />
        </FormField>
      </CellAt>
      {showSummary ? (
        <>
          <CellAt col={1} colSpan={2}>
            <FormField label="Products">
              <StaticFieldValue>{productsCount ?? 0}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={3} colSpan={3}>
            <FormField label="Created">
              <StaticFieldValue>{formatEasternDateTime(createdAt ?? null) || "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={6} colSpan={3}>
            <FormField label="Updated">
              <StaticFieldValue>{formatEasternDateTime(updatedAt ?? null) || "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
        </>
      ) : null}
    </FieldSection>
  )
}
