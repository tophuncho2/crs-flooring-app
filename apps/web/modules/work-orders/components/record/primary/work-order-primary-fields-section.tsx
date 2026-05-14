"use client"

import { useCallback, useEffect, useState } from "react"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField, StaticFieldValue } from "@/components/fields"
import {
  CheckboxCell,
  DateCell,
  SelectCell,
  TextCell,
  TextareaCell,
} from "@/components/cells"
import {
  PropertyJoinedReadOnlyCells,
  type PropertyJoinedFields,
} from "@/modules/shared/property-fields"
import { JobTypePicker } from "@/modules/job-types/components/picker/job-type-picker"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"
import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"
import { TemplatePicker } from "@/modules/templates/components/picker/template-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import {
  WO_DESCRIPTION_MAX,
  WO_UNIT_NUMBER_MAX,
  WO_UNIT_TYPE_MAX,
  type PropertyOption,
  type WorkOrderForm,
} from "@builders/domain"

const VACANCY_OPTIONS = [
  { value: "VACANT", label: "Vacant" },
  { value: "OCCUPIED", label: "Occupied" },
]

/**
 * Slim joined-name + joined-property snapshot the section needs from the
 * saved WO. Drives read-only label rendering and seeds the pickers'
 * `selectedLabel` so the trigger shows the saved selection without a
 * server round-trip. Pass `null` from create flows.
 */
export type WorkOrderPrimaryDetail = {
  propertyId: string
  propertyName: string
  propertyStreetAddress: string
  propertyCity: string
  propertyState: string
  propertyPostalCode: string
  propertyInstructions: string
  managementCompanyId: string | null
  managementCompanyName: string | null
  templateId: string | null
  templateNumber: string
  jobTypeId: string | null
  jobTypeName: string | null
  warehouseId: string | null
  warehouseName: string
}

function detailToPropertyJoined(
  detail: WorkOrderPrimaryDetail | null,
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

export function WorkOrderPrimaryFieldsSection({
  draft,
  detail,
  disabled,
  onFieldChange,
}: {
  draft: WorkOrderForm
  detail: WorkOrderPrimaryDetail | null
  disabled: boolean
  onFieldChange: <K extends keyof WorkOrderForm>(field: K, value: WorkOrderForm[K]) => void
}) {
  const editable = !disabled

  // Live preview override for the joined readonly cells. Initializes
  // from the saved detail; updates when PropertyPicker emits a new
  // option so the address/instructions cells track the dropdown
  // selection rather than waiting for save. Cleared whenever the saved
  // propertyId changes (after save / record swap) so the override does
  // not stomp the next record's joined fields.
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
  const templateValue = draft.templateId || null

  const managementCompanyLabel = detail?.managementCompanyName ?? null
  const propertyLabel = detail?.propertyName ?? null
  const templateLabel = detail?.templateNumber ? `#${detail.templateNumber}` : null

  return (
    <FieldSection>
      <CellAt col={1} row={1} colSpan={2}>
        <FormField label="Warehouse">
          {editable ? (
            <WarehousePicker
              value={draft.warehouseId || null}
              onChange={(id) => onFieldChange("warehouseId", id ?? "")}
              selectedLabel={detail?.warehouseName || null}
              placeholder="Select warehouse"
              ariaLabel="Warehouse"
            />
          ) : (
            <StaticFieldValue>{detail?.warehouseName || "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={3} row={1} colSpan={2}>
        <FormField label="Job Type">
          {editable ? (
            <JobTypePicker
              value={draft.jobTypeId || null}
              onChange={(id) => onFieldChange("jobTypeId", id ?? "")}
              selectedLabel={detail?.jobTypeName ?? null}
              placeholder="—"
              ariaLabel="Job type"
            />
          ) : (
            <StaticFieldValue>{detail?.jobTypeName ?? "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={5} row={1} colSpan={1}>
        <FormField label="Scheduled For">
          <DateCell
            editable={editable}
            value={draft.scheduledFor}
            onChange={(value) => onFieldChange("scheduledFor", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={7} row={1} colSpan={1}>
        <FormField label="Complete">
          <CheckboxCell
            editable={editable}
            value={draft.isComplete}
            onChange={(value) => onFieldChange("isComplete", value)}
          />
        </FormField>
      </CellAt>

      {/* Rows 2–4 — two stacked columns:
            left  (col 1, span 4): Management Company → Property → Template
            right (col 5, span 4): Vacancy → Unit Number → Unit Type */}
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
      <CellAt col={5} row={2} colSpan={4}>
        <FormField label="Vacancy">
          <SelectCell
            editable={editable}
            value={draft.vacancy}
            options={VACANCY_OPTIONS}
            placeholder="—"
            onChange={(value) => onFieldChange("vacancy", value as WorkOrderForm["vacancy"])}
          />
        </FormField>
      </CellAt>

      <CellAt col={1} row={3} colSpan={4}>
        <FormField label="Property">
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
      <CellAt col={5} row={3} colSpan={4}>
        <FormField label="Unit Number">
          <TextCell
            editable={editable}
            value={draft.unitNumber}
            onChange={(value) => onFieldChange("unitNumber", value)}
            maxLength={WO_UNIT_NUMBER_MAX}
          />
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
      <CellAt col={5} row={4} colSpan={4}>
        <FormField label="Unit Type">
          <TextCell
            editable={editable}
            value={draft.unitType}
            onChange={(value) => onFieldChange("unitType", value)}
            maxLength={WO_UNIT_TYPE_MAX}
          />
        </FormField>
      </CellAt>

      <CellAt col={1} row={5} colSpan={8}>
        <FormField label="Description">
          <TextareaCell
            editable={editable}
            value={draft.description}
            onChange={(value) => onFieldChange("description", value)}
            maxLength={WO_DESCRIPTION_MAX}
            rows={2}
          />
        </FormField>
      </CellAt>

      <CellAt col={1} row={6} colSpan={8}>
        <FormField label="Custom Address (overrides property address on PDF)">
          <TextareaCell
            editable={editable}
            value={draft.customAddress}
            onChange={(value) => onFieldChange("customAddress", value)}
            rows={2}
          />
        </FormField>
      </CellAt>

      <PropertyJoinedReadOnlyCells property={propertyJoined} startRow={7} />
    </FieldSection>
  )
}
