"use client"

import { useState } from "react"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import {
  CheckboxCell,
  SelectCell,
  TextCell,
  TextareaCell,
} from "@/components/cells"
import { RichDropdown } from "@/components/dropdowns/rich-dropdown"
import { SegmentedDropdown } from "@/components/dropdowns/segmented-dropdown"
import { SectionHeader } from "@/components/headers"

const MANAGEMENT_COMPANIES = [
  { value: "mc-1", label: "Bluepoint Management" },
  { value: "mc-2", label: "Holcomb Properties" },
  { value: "mc-3", label: "Brookhurst Commercial" },
]

const PROPERTIES = [
  {
    id: "prop-1",
    title: "Mercer Apartments",
    subtitles: ["1240 Mercer Ave · Springfield, IL"],
  },
  {
    id: "prop-2",
    title: "Holcomb Lofts",
    subtitles: ["88 Holcomb St · Springfield, IL"],
  },
  {
    id: "prop-3",
    title: "Patel Row",
    subtitles: ["402 Patel Row · Springfield, IL"],
  },
  {
    id: "prop-4",
    title: "Brookhurst Plaza",
    subtitles: ["3110 Brookhurst Blvd · Springfield, IL"],
  },
]

const TEMPLATES = [
  { value: "tpl-1", label: "TPL-0001 · 1BR/1BA" },
  { value: "tpl-2", label: "TPL-0002 · 2BR/2BA" },
  { value: "tpl-3", label: "TPL-0003 · Studio" },
]

const JOB_TYPES = [
  { value: "jt-1", label: "Make-Ready" },
  { value: "jt-2", label: "Renovation" },
  { value: "jt-3", label: "Premium Turn" },
]

const WAREHOUSES = [
  { value: "wh-1", label: "Darby" },
  { value: "wh-2", label: "Holcomb" },
]

const VACANCY_STATUSES = [
  { value: "VACANT", label: "Vacant" },
  { value: "OCCUPIED", label: "Occupied" },
]

export default function WorkOrderCellsSmokePage() {
  const [workOrderNumber, setWorkOrderNumber] = useState("WO-1042")
  const [managementCompanyId, setManagementCompanyId] = useState("mc-1")
  const [propertyId, setPropertyId] = useState<string | null>("prop-1")
  const [templateId, setTemplateId] = useState("tpl-2")
  const [jobTypeId, setJobTypeId] = useState("jt-1")
  const [warehouseId, setWarehouseId] = useState("wh-1")
  const [vacancyStatus, setVacancyStatus] = useState<string | null>("VACANT")
  const [isComplete, setIsComplete] = useState(false)
  const [date, setDate] = useState("2026-04-27")
  const [unitNumber, setUnitNumber] = useState("204")
  const [unitType, setUnitType] = useState("2BR/2BA")
  const [address, setAddress] = useState("1240 Mercer Ave · Unit 204")
  const [description, setDescription] = useState("Standard 2BR turn — vinyl plank + carpet bedrooms")
  const [instructions, setInstructions] = useState("Pull existing carpet/pad day 1. Vinyl install day 2. Carpet install day 3.")
  const [propertyInstructions, setPropertyInstructions] = useState("Notify Bluepoint front desk before crew arrival. Use freight elevator only.")
  const [notes, setNotes] = useState("")

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-8">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader
          title="Work Order Cells"
          subtitle="Cell-box rehearsal for the work-order primary section"
        />
        <div className="px-4 py-4">
          <FieldSection>
            {/* Row 1 */}
            <CellAt col={1} row={1} colSpan={2}>
              <FormField label="Work Order #">
                <TextCell editable value={workOrderNumber} onChange={setWorkOrderNumber} />
              </FormField>
            </CellAt>
            <CellAt col={3} row={1} colSpan={2}>
              <FormField label="Date">
                <TextCell editable value={date} onChange={setDate} placeholder="YYYY-MM-DD" />
              </FormField>
            </CellAt>
            <CellAt col={5} row={1} colSpan={2}>
              <FormField label="Unit #">
                <TextCell editable value={unitNumber} onChange={setUnitNumber} />
              </FormField>
            </CellAt>
            <CellAt col={7} row={1} colSpan={2}>
              <FormField label="Unit Type">
                <TextCell editable value={unitType} onChange={setUnitType} />
              </FormField>
            </CellAt>

            {/* Row 2 */}
            <CellAt col={1} row={2} colSpan={2}>
              <FormField label="Management Company">
                <SelectCell
                  editable
                  value={managementCompanyId}
                  onChange={setManagementCompanyId}
                  options={MANAGEMENT_COMPANIES}
                  placeholder="Select management company"
                />
              </FormField>
            </CellAt>
            <CellAt col={3} row={2} colSpan={2}>
              <FormField label="Property">
                <RichDropdown
                  value={propertyId}
                  onChange={setPropertyId}
                  options={PROPERTIES}
                  placeholder="Select property"
                  searchPlaceholder="Search properties…"
                  ariaLabel="Property"
                />
              </FormField>
            </CellAt>
            <CellAt col={5} row={2} colSpan={2}>
              <FormField label="Template">
                <SelectCell
                  editable
                  value={templateId}
                  onChange={setTemplateId}
                  options={TEMPLATES}
                  placeholder="Select template"
                />
              </FormField>
            </CellAt>
            <CellAt col={7} row={2} colSpan={2}>
              <FormField label="Warehouse">
                <SelectCell
                  editable
                  value={warehouseId}
                  onChange={setWarehouseId}
                  options={WAREHOUSES}
                  placeholder="Select warehouse"
                />
              </FormField>
            </CellAt>

            {/* Row 3 */}
            <CellAt col={1} row={3} colSpan={2}>
              <FormField label="Job Type">
                <SelectCell
                  editable
                  value={jobTypeId}
                  onChange={setJobTypeId}
                  options={JOB_TYPES}
                  placeholder="Select job type"
                />
              </FormField>
            </CellAt>
            <CellAt col={3} row={3} colSpan={2}>
              <FormField label="Vacancy Status">
                <SegmentedDropdown
                  value={vacancyStatus}
                  onChange={setVacancyStatus}
                  options={VACANCY_STATUSES}
                  allowClear
                  clearLabel="None"
                  ariaLabel="Vacancy status"
                />
              </FormField>
            </CellAt>
            <CellAt col={5} row={3} colSpan={2}>
              <FormField label="Is Complete">
                <CheckboxCell
                  editable
                  value={isComplete}
                  onChange={setIsComplete}
                  ariaLabel="Is complete"
                />
              </FormField>
            </CellAt>

            {/* Row 4 — Address (full width) */}
            <CellAt col={1} row={4} colSpan={8}>
              <FormField label="Address">
                <TextCell editable value={address} onChange={setAddress} />
              </FormField>
            </CellAt>

            {/* Row 5 — Description */}
            <CellAt col={1} row={5} colSpan={8}>
              <FormField label="Description">
                <TextareaCell editable value={description} onChange={setDescription} rows={2} />
              </FormField>
            </CellAt>

            {/* Row 6 — Instructions */}
            <CellAt col={1} row={6} colSpan={8}>
              <FormField label="Instructions">
                <TextareaCell editable value={instructions} onChange={setInstructions} rows={3} />
              </FormField>
            </CellAt>

            {/* Row 7 — Property Instructions */}
            <CellAt col={1} row={7} colSpan={8}>
              <FormField label="Property Instructions">
                <TextareaCell
                  editable
                  value={propertyInstructions}
                  onChange={setPropertyInstructions}
                  rows={3}
                />
              </FormField>
            </CellAt>

            {/* Row 8 — Notes */}
            <CellAt col={1} row={8} colSpan={8}>
              <FormField label="Notes">
                <TextareaCell editable value={notes} onChange={setNotes} rows={3} />
              </FormField>
            </CellAt>
          </FieldSection>
        </div>
      </div>
    </div>
  )
}
