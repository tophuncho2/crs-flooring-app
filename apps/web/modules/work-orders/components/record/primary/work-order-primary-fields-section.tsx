"use client"

import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import {
  CheckboxCell,
  DateCell,
  SelectCell,
  StatusCell,
  TextCell,
  TextareaCell,
} from "@/components/cells"
import { PropertyJoinedReadOnlyCells } from "@/modules/shared/property-fields"
import type { WorkOrderForm } from "@builders/domain"
import type {
  JobTypeOption,
  ManagementCompanyOption,
  PropertyOption,
  TemplateOption,
  WarehouseOption,
} from "@/modules/work-orders/controllers/record/drafts"

const VACANCY_OPTIONS = [
  { value: "VACANT", label: "Vacant" },
  { value: "OCCUPIED", label: "Occupied" },
]

export function WorkOrderPrimaryFieldsSection({
  draft,
  workOrderNumber,
  status,
  propertyOptions,
  warehouseOptions,
  jobTypeOptions,
  managementCompanyOptions,
  templateOptions,
  disabled,
  onFieldChange,
}: {
  draft: WorkOrderForm
  workOrderNumber: string
  status: string
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  jobTypeOptions: JobTypeOption[]
  managementCompanyOptions: ManagementCompanyOption[]
  templateOptions: TemplateOption[]
  disabled: boolean
  onFieldChange: <K extends keyof WorkOrderForm>(field: K, value: WorkOrderForm[K]) => void
}) {
  const editable = !disabled

  const propertySelectOptions = propertyOptions.map((o) => ({ value: o.id, label: o.label }))
  const warehouseSelectOptions = warehouseOptions.map((o) => ({ value: o.id, label: o.name }))
  const jobTypeSelectOptions = jobTypeOptions.map((o) => ({ value: o.id, label: o.name }))
  const managementCompanySelectOptions = managementCompanyOptions.map((o) => ({
    value: o.id,
    label: o.name,
  }))
  const templateSelectOptions = templateOptions.map((o) => ({
    value: o.id,
    label: `${o.templateNumber} (${o.unitType})`,
  }))

  const selectedProperty = propertyOptions.find((o) => o.id === draft.propertyId) ?? null

  return (
    <FieldSection>
      <CellAt col={1} row={1} colSpan={2}>
        <FormField label="Work Order #">
          <TextCell editable={false} value={workOrderNumber} onChange={() => undefined} />
        </FormField>
      </CellAt>
      <CellAt col={3} row={1} colSpan={2}>
        <FormField label="Warehouse">
          <SelectCell
            editable={editable}
            value={draft.warehouseId}
            options={warehouseSelectOptions}
            placeholder="Select warehouse"
            onChange={(value) => onFieldChange("warehouseId", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={5} row={1} colSpan={1}>
        <FormField label="Job Type">
          <SelectCell
            editable={editable}
            value={draft.jobTypeId}
            options={jobTypeSelectOptions}
            placeholder="—"
            onChange={(value) => onFieldChange("jobTypeId", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={6} row={1} colSpan={1}>
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
      <CellAt col={8} row={1} colSpan={1}>
        <FormField label="Status">
          <StatusCell editable={false} value={status} onChange={() => undefined} />
        </FormField>
      </CellAt>

      <CellAt col={1} row={2} colSpan={3}>
        <FormField label="Management Company">
          <SelectCell
            editable={editable}
            value={draft.managementCompanyId}
            options={managementCompanySelectOptions}
            placeholder="—"
            onChange={(value) => onFieldChange("managementCompanyId", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={4} row={2} colSpan={2}>
        <FormField label="Property">
          <SelectCell
            editable={editable}
            value={draft.propertyId}
            options={propertySelectOptions}
            placeholder="Select property"
            onChange={(value) => onFieldChange("propertyId", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={6} row={2} colSpan={3}>
        <FormField label="Template">
          <SelectCell
            editable={editable}
            value={draft.templateId}
            options={templateSelectOptions}
            placeholder="—"
            onChange={(value) => onFieldChange("templateId", value)}
          />
        </FormField>
      </CellAt>

      <CellAt col={1} row={3} colSpan={3}>
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
      <CellAt col={4} row={3} colSpan={2}>
        <FormField label="Unit Number">
          <TextCell
            editable={editable}
            value={draft.unitNumber}
            onChange={(value) => onFieldChange("unitNumber", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={6} row={3} colSpan={3}>
        <FormField label="Unit Type">
          <TextCell
            editable={editable}
            value={draft.unitType}
            onChange={(value) => onFieldChange("unitType", value)}
          />
        </FormField>
      </CellAt>

      <CellAt col={1} row={4} colSpan={8}>
        <FormField label="Custom Address (overrides property address on PDF)">
          <TextareaCell
            editable={editable}
            value={draft.customAddress}
            onChange={(value) => onFieldChange("customAddress", value)}
            rows={2}
          />
        </FormField>
      </CellAt>

      <PropertyJoinedReadOnlyCells property={selectedProperty} startRow={5} />

      <CellAt col={1} row={7} colSpan={8}>
        <FormField label="Description">
          <TextareaCell
            editable={editable}
            value={draft.description}
            onChange={(value) => onFieldChange("description", value)}
            rows={2}
          />
        </FormField>
      </CellAt>

      <CellAt col={1} row={8} colSpan={8}>
        <FormField label="Instructions">
          <TextareaCell
            editable={editable}
            value={draft.instructions}
            onChange={(value) => onFieldChange("instructions", value)}
            rows={3}
          />
        </FormField>
      </CellAt>

      <CellAt col={1} row={9} colSpan={8}>
        <FormField label="Notes">
          <TextareaCell
            editable={editable}
            value={draft.notes}
            onChange={(value) => onFieldChange("notes", value)}
            rows={3}
          />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
