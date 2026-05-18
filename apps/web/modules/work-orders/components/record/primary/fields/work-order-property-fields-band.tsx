"use client"

import { CellAt } from "@/components/layout-grid"
import { FormField, StaticFieldValue } from "@/components/fields"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"
import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"
import { TemplatePicker } from "@/modules/templates/components/picker/template-picker"
import type { PropertyOption, WorkOrderForm } from "@builders/domain"
import type { WorkOrderPrimaryDetail } from "../types"

/**
 * Left column of rows 2–4: Management Company → Property → Template.
 * Owns the chained picker scoping: Property is filtered by the picked
 * Management Company, Template by the picked Property. Renders inside
 * a parent `FieldSection`.
 */
export function WorkOrderPropertyFieldsBand({
  editable,
  draft,
  detail,
  onFieldChange,
  onPropertyOption,
}: {
  editable: boolean
  draft: WorkOrderForm
  detail: WorkOrderPrimaryDetail | null
  onFieldChange: <K extends keyof WorkOrderForm>(field: K, value: WorkOrderForm[K]) => void
  onPropertyOption: (option: PropertyOption | null) => void
}) {
  const managementCompanyValue = draft.managementCompanyId || null
  const propertyValue = draft.propertyId || null
  const templateValue = draft.templateId || null

  const managementCompanyLabel = detail?.managementCompanyName ?? null
  const propertyLabel = detail?.propertyName ?? null
  const templateLabel = detail?.templateNumber ? `#${detail.templateNumber}` : null

  return (
    <>
      <CellAt col={1} row={2} colSpan={4}>
        <FormField label="Management Company">
          {editable ? (
            <ManagementCompanyPicker
              value={managementCompanyValue}
              onChange={(id) => onFieldChange("managementCompanyId", id ?? "")}
              selectedLabel={managementCompanyLabel}
              placeholder="—"
              ariaLabel="Management company"
            />
          ) : (
            <StaticFieldValue>{managementCompanyLabel ?? "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={1} row={3} colSpan={4}>
        <FormField label="Property">
          {editable ? (
            <PropertyPicker
              value={propertyValue}
              onChange={(id) => onFieldChange("propertyId", id ?? "")}
              onOptionSelected={onPropertyOption}
              managementCompanyId={managementCompanyValue}
              selectedLabel={propertyLabel}
              placeholder="Select property"
              ariaLabel="Property"
            />
          ) : (
            <StaticFieldValue>{propertyLabel ?? "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={1} row={4} colSpan={4}>
        <FormField label="Template">
          {editable ? (
            <TemplatePicker
              value={templateValue}
              onChange={(id) => onFieldChange("templateId", id ?? "")}
              propertyId={propertyValue}
              selectedLabel={templateLabel}
              placeholder="—"
              ariaLabel="Template"
            />
          ) : (
            <StaticFieldValue>{templateLabel ?? "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
    </>
  )
}
