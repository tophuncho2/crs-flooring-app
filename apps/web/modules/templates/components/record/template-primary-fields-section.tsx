"use client"

import { useCallback, useEffect, useState } from "react"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField, StaticFieldValue } from "@/components/fields"
import { TextCell, TextareaCell } from "@/components/cells"
import {
  PropertyJoinedReadOnlyCells,
  type PropertyJoinedFields,
} from "@/modules/shared/property-fields"
import { JobTypePicker } from "@/modules/job-types/components/picker/job-type-picker"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"
import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import type { PropertyOption, TemplateForm } from "@builders/domain"

/**
 * Slim joined-name + joined-property snapshot the section needs from
 * the saved template. Drives read-only label rendering and seeds the
 * pickers' `selectedLabel` so the trigger shows the saved selection
 * without a server round-trip. Pass `null` from create flows.
 */
export type TemplatePrimaryDetail = {
  propertyId: string
  propertyName: string
  propertyStreetAddress: string
  propertyCity: string
  propertyState: string
  propertyPostalCode: string
  propertyInstructions: string
  managementCompanyId: string | null
  managementCompanyName: string | null
  jobTypeId: string | null
  jobTypeName: string | null
  warehouseId: string | null
  warehouseName: string
}

function detailToPropertyJoined(
  detail: TemplatePrimaryDetail | null,
): PropertyJoinedFields | null {
  if (!detail) return null
  return {
    streetAddress: detail.propertyStreetAddress,
    city: detail.propertyCity,
    state: detail.propertyState,
    postalCode: detail.propertyPostalCode,
    instructions: detail.propertyInstructions,
  }
}

export function TemplatePrimaryFieldsSection({
  draft,
  detail,
  disabled,
  onFieldChange,
}: {
  draft: TemplateForm
  detail: TemplatePrimaryDetail | null
  disabled: boolean
  onFieldChange: (field: keyof TemplateForm, value: string) => void
}) {
  const editable = !disabled

  // Live preview override for the joined readonly cells (mirrors WO).
  // Initializes from the saved detail; updates when PropertyPicker
  // emits a new option so the address/instructions cells track the
  // dropdown selection rather than waiting for save. Cleared whenever
  // the saved propertyId changes (after save / record swap).
  const [pickedPropertyJoined, setPickedPropertyJoined] = useState<PropertyJoinedFields | null>(
    null,
  )
  useEffect(() => {
    setPickedPropertyJoined(null)
  }, [detail?.propertyId])

  const propertyJoined = pickedPropertyJoined ?? detailToPropertyJoined(detail)

  const handlePropertyOption = useCallback((option: PropertyOption | null) => {
    if (option === null) {
      setPickedPropertyJoined(null)
      return
    }
    setPickedPropertyJoined({
      streetAddress: option.streetAddress,
      city: option.city,
      state: option.state,
      postalCode: option.postalCode,
      instructions: option.instructions,
    })
  }, [])

  const managementCompanyValue = draft.managementCompanyId || null
  const propertyValue = draft.propertyId || null

  const managementCompanyLabel = detail?.managementCompanyName ?? null
  const propertyLabel = detail?.propertyName ?? null

  return (
    <FieldSection>
      {/* Row 1: Management Company · Property · Job Type · Unit Type */}
      <CellAt col={1} row={1} colSpan={2}>
        <FormField label="Management Company">
          {editable ? (
            <ManagementCompanyPicker
              value={managementCompanyValue}
              onChange={(id) => onFieldChange("managementCompanyId", id ?? "")}
              selectedLabel={managementCompanyLabel}
              placeholder="No management company"
              ariaLabel="Management company"
            />
          ) : (
            <StaticFieldValue>{managementCompanyLabel ?? "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={3} row={1} colSpan={2}>
        <FormField label="Property" required>
          {editable ? (
            <PropertyPicker
              value={propertyValue}
              onChange={(id) => onFieldChange("propertyId", id ?? "")}
              onOptionSelected={handlePropertyOption}
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
      <CellAt col={5} row={1} colSpan={2}>
        <FormField label="Job Type">
          {editable ? (
            <JobTypePicker
              value={draft.jobTypeId || null}
              onChange={(id) => onFieldChange("jobTypeId", id ?? "")}
              selectedLabel={detail?.jobTypeName ?? null}
              placeholder="No job type"
              ariaLabel="Job type"
            />
          ) : (
            <StaticFieldValue>{detail?.jobTypeName ?? "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={7} row={1} colSpan={2}>
        <FormField label="Unit Type">
          <TextCell
            editable={editable}
            value={draft.unitType}
            onChange={(value) => onFieldChange("unitType", value)}
          />
        </FormField>
      </CellAt>

      {/* Row 2: Warehouse · Description */}
      <CellAt col={1} row={2} colSpan={2}>
        <FormField label="Warehouse">
          {editable ? (
            <WarehousePicker
              value={draft.warehouseId || null}
              onChange={(id) => onFieldChange("warehouseId", id ?? "")}
              selectedLabel={detail?.warehouseName || null}
              placeholder="No warehouse"
              ariaLabel="Warehouse"
            />
          ) : (
            <StaticFieldValue>{detail?.warehouseName || "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={3} row={2} colSpan={6}>
        <FormField label="Description">
          <TextCell
            editable={editable}
            value={draft.description}
            onChange={(value) => onFieldChange("description", value)}
          />
        </FormField>
      </CellAt>

      {/* Row 3: Instructions (full width) */}
      <CellAt col={1} row={3} colSpan={8}>
        <FormField label="Instructions">
          <TextareaCell
            editable={editable}
            value={draft.instructions}
            onChange={(value) => onFieldChange("instructions", value)}
            rows={3}
          />
        </FormField>
      </CellAt>

      {/* Rows 4-5: Property address + instructions (read-only, live from selection) */}
      <PropertyJoinedReadOnlyCells property={propertyJoined} startRow={4} />
    </FieldSection>
  )
}
