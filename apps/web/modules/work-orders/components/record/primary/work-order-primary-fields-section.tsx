"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  CellAddButton,
  CellAt,
  CellOpenButton,
  DateCell,
  FieldSection,
  FormField,
  SegmentedChoiceCell,
  StaticFieldValue,
  TextCell,
  TextareaCell,
} from "@/engines/record-view"
import { applyPropertySelection, applyTemplateSelection } from "@/engines/picker"
import {
  buildCurrentRecordEntryPath,
  buildPropertyRecordHref,
  buildRecordCreateHref,
  buildRecordDetailHref,
  buildTemplateHubHref,
} from "@/hooks/navigation/routes"
import { JobTypePicker } from "@/modules/job-types/components/picker/job-type-picker"
import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"
import { TemplatePicker } from "@/modules/templates/components/picker/template-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import {
  buildAddressBlock,
  formatEasternDateTime,
  WO_CUSTOM_ADDRESS_MAX,
  WO_DESCRIPTION_MAX,
  WO_INSTALLER_INSTRUCTIONS_MAX,
  WO_INTERNAL_NOTES_MAX,
  WO_UNIT_NUMBER_MAX,
  WO_UNIT_TYPE_MAX,
  type WorkOrderForm,
} from "@builders/domain"
import { TIME_OF_DAY_OPTIONS, VACANCY_OPTIONS } from "./helpers"
import type { WorkOrderPrimaryDetail } from "./types"
import { usePropertyJoinedOverride } from "./use-property-joined-override"

export type { WorkOrderPrimaryDetail } from "./types"

/**
 * WO primary section, on the canonical record-view invisible grid. One
 * `FieldSection` (8-col `LayoutGrid`) places every cell with `CellAt`,
 * mirroring `products`/`properties`. The former Schedule / Property & Unit /
 * Notes card groupings are gone — every field flows as one continuous grid.
 *
 * Layout: schedule pickers sit two-up (2 cols each) across the left half; from
 * the management-company cell down, every field is a single 4-col stack on the
 * left, leaving the right half open.
 *
 * The "open MC / Property / Template" + "new property" affordances that used to
 * live in a group header now sit in each field's label-row `actions` slot via
 * the record-view `CellOpenButton` / `CellAddButton` primitives.
 *
 * Cascade rules come from the shared engine (`@/engines/picker`
 * `applyPropertySelection` / `applyTemplateSelection`):
 *  - Property change/clear → clears templateId, back-fills the property's MC
 *  - Template change → no cascade
 *  - Template option-select also writes the template's unitType into the draft
 *    (WO-specific side-effect, not a cascade rule).
 */
export function WorkOrderPrimaryFieldsSection({
  draft,
  detail,
  disabled,
  onFieldChange,
  onFieldsChange,
}: {
  draft: WorkOrderForm
  detail: WorkOrderPrimaryDetail | null
  disabled: boolean
  onFieldChange: <K extends keyof WorkOrderForm>(field: K, value: WorkOrderForm[K]) => void
  /** Multi-field setter — used for the MC→Property→Template cascade. */
  onFieldsChange: (patch: Partial<WorkOrderForm>) => void
}) {
  const editable = !disabled
  const { propertyJoined: joined, handlePropertyOption } = usePropertyJoinedOverride(detail)
  const propertyJoined = draft.propertyId ? joined : null

  const propertyValue = draft.propertyId || null
  const templateValue = draft.templateId || null

  // Local label snapshots so the picker triggers show the just-picked name
  // immediately, before the section save reconciles a fresh `detail`. Each
  // resets at render time when its bound detail id changes (previous-value
  // tracking) so the next record's saved name shows without a post-commit effect.
  const [pickedWarehouseLabel, setPickedWarehouseLabel] = useState<string | null>(null)
  const [trackedWarehouseId, setTrackedWarehouseId] = useState(detail?.warehouseId)
  if (trackedWarehouseId !== detail?.warehouseId) {
    setTrackedWarehouseId(detail?.warehouseId)
    setPickedWarehouseLabel(null)
  }

  const [pickedJobTypeLabel, setPickedJobTypeLabel] = useState<string | null>(null)
  const [trackedJobTypeId, setTrackedJobTypeId] = useState(detail?.jobTypeId)
  if (trackedJobTypeId !== detail?.jobTypeId) {
    setTrackedJobTypeId(detail?.jobTypeId)
    setPickedJobTypeLabel(null)
  }

  // The management company is a read-only mirror of the selected property's MC
  // (work orders no longer store their own). Track the picked property's MC id +
  // name so the cell + "open MC" link follow a re-select before save.
  const [pickedPropertyLabel, setPickedPropertyLabel] = useState<string | null>(null)
  const [pickedTemplateLabel, setPickedTemplateLabel] = useState<string | null>(null)
  const [pickedMc, setPickedMc] = useState<{ id: string | null; name: string | null } | null>(null)

  const [trackedPropertyId, setTrackedPropertyId] = useState(detail?.propertyId)
  if (trackedPropertyId !== detail?.propertyId) {
    setTrackedPropertyId(detail?.propertyId)
    setPickedPropertyLabel(null)
    setPickedMc(null)
  }
  const [trackedTemplateId, setTrackedTemplateId] = useState(detail?.templateId)
  if (trackedTemplateId !== detail?.templateId) {
    setTrackedTemplateId(detail?.templateId)
    setPickedTemplateLabel(null)
  }

  const warehouseLabel = pickedWarehouseLabel ?? detail?.warehouseName ?? null
  const jobTypeLabel = pickedJobTypeLabel ?? detail?.jobTypeName ?? null
  const managementCompanyValue = pickedMc ? pickedMc.id : detail?.managementCompanyId ?? null
  const managementCompanyLabel = pickedMc ? pickedMc.name : detail?.managementCompanyName ?? null
  const propertyLabel = pickedPropertyLabel ?? detail?.propertyName ?? null
  const templateLabel = pickedTemplateLabel ?? (detail?.templateUnitType || null)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

  const formattedAddress = propertyJoined
    ? buildAddressBlock({
        streetAddress: propertyJoined.streetAddress || null,
        city: propertyJoined.city || null,
        state: propertyJoined.state || null,
        postalCode: propertyJoined.postalCode || null,
      })
    : ""
  const addressDisplay = formattedAddress || "—"
  const instructionsDisplay = propertyJoined?.instructions || "—"

  return (
    <FieldSection>
      {/* Schedule — pickers two-up across the right half */}
      <CellAt col={5} row={1} colSpan={2}>
        <FormField label="Warehouse">
          {editable ? (
            <WarehousePicker
              value={draft.warehouseId || null}
              onChange={(id) => onFieldChange("warehouseId", id ?? "")}
              onOptionSelected={(option) => setPickedWarehouseLabel(option?.name ?? null)}
              selectedLabel={warehouseLabel}
              placeholder="Select warehouse"
              ariaLabel="Warehouse"
            />
          ) : (
            <StaticFieldValue>{warehouseLabel || "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={7} row={1} colSpan={1}>
        <FormField label="Job Type">
          {editable ? (
            <JobTypePicker
              value={draft.jobTypeId || null}
              onChange={(id) => onFieldChange("jobTypeId", id ?? "")}
              onOptionSelected={(option) => setPickedJobTypeLabel(option?.name ?? null)}
              selectedLabel={jobTypeLabel}
              placeholder="—"
              ariaLabel="Job type"
            />
          ) : (
            <StaticFieldValue>{jobTypeLabel ?? "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={5} row={2} colSpan={2}>
        <FormField label="Scheduled For">
          <DateCell
            editable={editable}
            value={draft.scheduledFor}
            onChange={(value) => onFieldChange("scheduledFor", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={7} row={2} colSpan={1}>
        <FormField label="Time of Day">
          <SegmentedChoiceCell
            editable={editable}
            value={draft.timeOfDay}
            options={TIME_OF_DAY_OPTIONS}
            ariaLabel="Time of Day"
            onChange={(value) => onFieldChange("timeOfDay", value as WorkOrderForm["timeOfDay"])}
          />
        </FormField>
      </CellAt>
      <CellAt col={5} row={3} colSpan={3}>
        <FormField
          label="Description"
          currentLength={editable ? draft.description.length : undefined}
          maxLength={editable ? WO_DESCRIPTION_MAX : undefined}
        >
          <TextareaCell
            editable={editable}
            value={draft.description}
            onChange={(value) => onFieldChange("description", value)}
            maxLength={WO_DESCRIPTION_MAX}
            rows={3}
          />
        </FormField>
      </CellAt>

      {/* Management company + property pair the schedule rows on the left */}
      <CellAt col={1} row={1} colSpan={4}>
        <FormField
          label="Management Company"
          actions={
            <CellOpenButton
              ariaLabel="Open management company"
              title="Open management company"
              disabled={!managementCompanyValue}
              onClick={() => {
                if (managementCompanyValue) {
                  router.push(
                    buildRecordDetailHref(
                      "/dashboard/management-companies",
                      managementCompanyValue,
                      returnTo,
                    ),
                  )
                }
              }}
            />
          }
        >
          <StaticFieldValue>{managementCompanyLabel ?? "—"}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={1} row={2} colSpan={4}>
        <FormField
          label="Property"
          required
          actions={
            <>
              <CellOpenButton
                ariaLabel="Open property"
                title="Open property"
                disabled={!propertyValue}
                onClick={() => {
                  if (propertyValue) {
                    router.push(buildPropertyRecordHref(propertyValue, managementCompanyValue, returnTo))
                  }
                }}
              />
              {editable ? (
                <CellAddButton
                  ariaLabel="New property"
                  title="New property"
                  onClick={() =>
                    router.push(buildRecordCreateHref("/dashboard/management-companies", { returnTo }))
                  }
                />
              ) : null}
            </>
          }
        >
          {editable ? (
            <PropertyPicker
              value={propertyValue}
              onChange={() => {}}
              onOptionSelected={(option) => {
                const patch = applyPropertySelection(option)
                onFieldsChange({
                  propertyId: patch.propertyId ?? "",
                  templateId: patch.templateId ?? "",
                })
                setPickedPropertyLabel(patch.propertyLabel ?? null)
                setPickedTemplateLabel(patch.templateLabel ?? null)
                // MC mirrors the chosen property (null when it has none).
                setPickedMc({
                  id: option?.managementCompanyId ?? null,
                  name: option?.managementCompanyName ?? null,
                })
                handlePropertyOption(option)
              }}
              selectedLabel={propertyLabel}
              placeholder="Select property"
              ariaLabel="Property"
            />
          ) : (
            <StaticFieldValue>{propertyLabel ?? "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      {/* Template → notes: single 4-col stack on the left, under Description */}
      <CellAt col={1} row={5} colSpan={4}>
        <FormField
          label="Template"
          actions={
            <CellOpenButton
              ariaLabel="Open template record"
              title="Open template record"
              disabled={!templateValue}
              onClick={() => {
                if (templateValue) {
                  router.push(buildTemplateHubHref({ templateId: templateValue, returnTo }))
                }
              }}
            />
          }
        >
          {editable ? (
            <TemplatePicker
              value={templateValue}
              onChange={() => {}}
              onOptionSelected={(option) => {
                const patch = applyTemplateSelection(option)
                onFieldChange("templateId", patch.templateId ?? "")
                setPickedTemplateLabel(patch.templateLabel ?? null)
                // WO-specific side-effect: mirror the template's unit type.
                if (option) onFieldChange("unitType", option.unitType)
              }}
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
      <CellAt col={1} row={6} colSpan={4}>
        <FormField
          label="Unit Type"
          currentLength={editable ? draft.unitType.length : undefined}
          maxLength={editable ? WO_UNIT_TYPE_MAX : undefined}
        >
          <TextCell
            editable={editable}
            value={draft.unitType}
            onChange={(value) => onFieldChange("unitType", value)}
            maxLength={WO_UNIT_TYPE_MAX}
          />
        </FormField>
      </CellAt>
      <CellAt col={1} row={7} colSpan={2}>
        <FormField
          label="Unit Number"
          currentLength={editable ? draft.unitNumber.length : undefined}
          maxLength={editable ? WO_UNIT_NUMBER_MAX : undefined}
        >
          <TextCell
            editable={editable}
            value={draft.unitNumber}
            onChange={(value) => onFieldChange("unitNumber", value)}
            maxLength={WO_UNIT_NUMBER_MAX}
          />
        </FormField>
      </CellAt>
      <CellAt col={3} row={7} colSpan={2}>
        <FormField label="Vacancy" required>
          <SegmentedChoiceCell
            editable={editable}
            value={draft.vacancy}
            options={VACANCY_OPTIONS}
            ariaLabel="Vacancy"
            onChange={(value) => onFieldChange("vacancy", value as WorkOrderForm["vacancy"])}
          />
        </FormField>
      </CellAt>
      {/* Property address + custom address sit to the left of Description */}
      <CellAt col={1} row={3} colSpan={2}>
        <FormField label="Property Address">
          <StaticFieldValue>
            <span className="whitespace-pre-line">{addressDisplay}</span>
          </StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={1} row={4} colSpan={4}>
        <FormField label="Property Instructions">
          <StaticFieldValue>
            <span className="whitespace-pre-line">{instructionsDisplay}</span>
          </StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={3} row={3} colSpan={2}>
        <FormField
          label="Custom Address"
          currentLength={editable ? draft.customAddress.length : undefined}
          maxLength={editable ? WO_CUSTOM_ADDRESS_MAX : undefined}
        >
          <TextareaCell
            editable={editable}
            value={draft.customAddress}
            onChange={(value) => onFieldChange("customAddress", value)}
            maxLength={WO_CUSTOM_ADDRESS_MAX}
            rows={2}
          />
        </FormField>
      </CellAt>
      <CellAt col={1} row={8} colSpan={4}>
        <FormField
          label="Installer Instructions"
          currentLength={editable ? draft.installerInstructions.length : undefined}
          maxLength={editable ? WO_INSTALLER_INSTRUCTIONS_MAX : undefined}
        >
          <TextareaCell
            editable={editable}
            value={draft.installerInstructions}
            onChange={(value) => onFieldChange("installerInstructions", value)}
            maxLength={WO_INSTALLER_INSTRUCTIONS_MAX}
            rows={2}
          />
        </FormField>
      </CellAt>
      <CellAt col={1} row={9} colSpan={4}>
        <FormField
          label="Internal Notes"
          currentLength={editable ? draft.internalNotes.length : undefined}
          maxLength={editable ? WO_INTERNAL_NOTES_MAX : undefined}
        >
          <TextareaCell
            editable={editable}
            value={draft.internalNotes}
            onChange={(value) => onFieldChange("internalNotes", value)}
            maxLength={WO_INTERNAL_NOTES_MAX}
            rows={4}
          />
        </FormField>
      </CellAt>
      {detail ? (
        <>
          <CellAt col={1} row={10} colSpan={1}>
            <FormField label="Created">
              <StaticFieldValue>{formatEasternDateTime(detail.createdAt) || "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={2} row={10} colSpan={1}>
            <FormField label="Updated">
              <StaticFieldValue>{formatEasternDateTime(detail.updatedAt) || "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
        </>
      ) : null}
    </FieldSection>
  )
}
