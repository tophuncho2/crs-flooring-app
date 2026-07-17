"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  AddressEditCell,
  CellAt,
  RecordColumnBreak,
  RecordOpenButton,
  RecordSectionDivider,
  DateCell,
  FieldSection,
  FormField,
  SegmentedChoiceCell,
  StaticFieldValue,
  TextCell,
  TextareaCell,
} from "@/engines/record-view"
import { CellAddButton, CellChip, PaletteColorDropdown } from "@/engines/common"
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
  formatEasternDateTime,
  WO_CUSTOMER_NAME_MAX,
  WO_DESCRIPTION_MAX,
  WO_INSTALLER_MAX,
  WO_INSTALLER_INSTRUCTIONS_MAX,
  WO_INTERNAL_NOTES_MAX,
  WO_PURCHASE_ORDER_NUMBER_MAX,
  WO_RETURN_MAX,
  WO_UNIT_NUMBER_MAX,
  WO_UNIT_TYPE_MAX,
  type PropertyOption,
  type TemplateOption,
  type WorkOrderForm,
} from "@builders/domain"
import { TIME_OF_DAY_OPTIONS, VACANCY_OPTIONS } from "./helpers"
import type { WorkOrderPrimaryDetail } from "./types"
import { usePropertyJoinedOverride } from "./use-property-joined-override"

export type { WorkOrderPrimaryDetail } from "./types"

/**
 * WO primary section, on the canonical record-view centered layout. A
 * `RecordColumnBreak` splits the fields into two independent flanks, each its
 * own 8-col `FieldSection`: the left flank holds the identity / property / unit
 * cluster (WO number, then a warehouse-width Color + Vacancy row, then Entity,
 * Property, addresses, instructions); the right flank holds schedule / config / notes
 * (Warehouse, Job Type, Scheduled For, Time of Day, Description, Installer
 * Instructions, Internal Notes). A `RecordSectionDivider` terminates the section
 * above a read-only 2-cell Created / Updated footer (shown only on detail).
 *
 * The "open entity / Property / Template" + "new" affordances that used to live in a
 * group header now sit in each field's label-row `actions` slot: a
 * `RecordOpenButton` plus, on the Property and Template cells, a `CellAddButton`
 * that opens the proper create form (the quick-create modals were removed).
 *
 * Cascade rules come from the shared engine (`@/engines/picker`
 * `applyPropertySelection` / `applyTemplateSelection`):
 *  - Property change/clear → clears templateId, back-fills the property's entity
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
  printCounts,
}: {
  draft: WorkOrderForm
  detail: WorkOrderPrimaryDetail | null
  disabled: boolean
  onFieldChange: <K extends keyof WorkOrderForm>(field: K, value: WorkOrderForm[K]) => void
  /** Multi-field setter — used for the entity→Property→Template cascade. */
  onFieldsChange: (patch: Partial<WorkOrderForm>) => void
  /**
   * Per-doc-type print counts (read-only), shown beneath the actor cells. Omitted
   * in the create flow (a new WO has no print history).
   */
  printCounts?: ReadonlyArray<{ documentTypeName: string; count: number }>
}) {
  const editable = !disabled
  const { instructions: propertyInstructions, handlePropertyOption } = usePropertyJoinedOverride(detail)

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

  // The entity is a read-only mirror of the selected property's entity
  // (work orders no longer store their own). Track the picked property's entity id +
  // name so the cell + "open entity" link follow a re-select before save.
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
  const entityValue = pickedMc ? pickedMc.id : detail?.entityId ?? null
  const entityLabel = pickedMc ? pickedMc.name : detail?.entityName ?? null
  const propertyLabel = pickedPropertyLabel ?? detail?.propertyName ?? null
  const templateLabel = pickedTemplateLabel ?? (detail?.templateUnitType || null)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

  // Read-only Property Instructions preview — live from the selected property
  // (the property's address is now snapshotted into the WO's own editable cells,
  // not previewed here). Shown only while a property is selected.
  const instructionsDisplay = (draft.propertyId ? propertyInstructions : null) || "—"

  // Apply a property option to the cell — the shared path for both the picker and
  // the quick-create menu: cascade-fill the draft (clearing the template),
  // snapshot the labels + mirrored entity, and feed the Address/Instructions preview.
  const handlePropertySelected = (option: PropertyOption | null) => {
    const patch = applyPropertySelection(option)
    onFieldsChange({
      propertyId: patch.propertyId ?? "",
      templateId: patch.templateId ?? "",
      // Snapshot the property's address into the WO's own editable cells
      // (overwrite-on-pick). Clearing the property to none leaves the address
      // intact — it's WO-owned and editable once snapshotted.
      ...(option
        ? {
            streetAddress: option.streetAddress,
            city: option.city,
            state: option.state,
            zip: option.postalCode,
          }
        : {}),
    })
    setPickedPropertyLabel(patch.propertyLabel ?? null)
    setPickedTemplateLabel(patch.templateLabel ?? null)
    // entity mirrors the chosen property (null when it has none).
    setPickedMc({
      id: option?.entityId ?? null,
      name: option?.entityName ?? null,
    })
    handlePropertyOption(option)
  }

  // Apply a template option to the cell — the shared path for both the picker and
  // the quick-create menu. Mirrors the template's unit type into the WO draft
  // (a WO-specific side-effect, not a cascade rule).
  const handleTemplateSelected = (option: TemplateOption | null) => {
    const patch = applyTemplateSelection(option)
    onFieldChange("templateId", patch.templateId ?? "")
    setPickedTemplateLabel(patch.templateLabel ?? null)
    if (option) onFieldChange("unitType", option.unitType)
  }

  return (
    <div className="flex flex-col gap-4">
      <RecordColumnBreak
        left={
          <FieldSection gap="0.75rem">
            {/* Work Order Number + Color — equal-width top row (4/4, matching the split below) */}
            <CellAt col={1} row={1} colSpan={4}>
              <FormField label="Work Order Number">
                {detail ? (
                  <CellChip paletteColor={draft.color}>{detail.workOrderNumber}</CellChip>
                ) : (
                  <StaticFieldValue>—</StaticFieldValue>
                )}
              </FormField>
            </CellAt>
            <CellAt col={5} row={1} colSpan={4}>
              <FormField label="Color">
                <PaletteColorDropdown
                  value={draft.color}
                  editable={editable}
                  onChange={(color) => onFieldChange("color", color)}
                  ariaLabel="Work order color"
                />
              </FormField>
            </CellAt>
            {/* Entity → Property cascade stack */}
            <CellAt col={1} row={2} colSpan={8}>
              <FormField
                label="Entity"
                actions={
                  <RecordOpenButton
                    ariaLabel="Open entity"
                    title="Open entity"
                    disabled={!entityValue}
                    onClick={() => {
                      if (entityValue) {
                        router.push(
                          buildRecordDetailHref(
                            "/dashboard/entities",
                            entityValue,
                            returnTo,
                          ),
                        )
                      }
                    }}
                  />
                }
              >
                <StaticFieldValue>{entityLabel ?? "—"}</StaticFieldValue>
              </FormField>
            </CellAt>
            <CellAt col={1} row={3} colSpan={8}>
              <FormField
                label="Property"
                actions={
                  <>
                    <RecordOpenButton
                      ariaLabel="Open property"
                      title="Open property"
                      disabled={!propertyValue}
                      onClick={() => {
                        if (propertyValue) {
                          router.push(buildPropertyRecordHref(propertyValue, entityValue, returnTo))
                        }
                      }}
                    />
                    {editable ? (
                      <CellAddButton
                        ariaLabel="New property"
                        title="New property"
                        onClick={() =>
                          router.push(buildRecordCreateHref("/dashboard/entities", { returnTo }))
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
                    onOptionSelected={handlePropertySelected}
                    selectedLabel={propertyLabel}
                    placeholder="Select property"
                    ariaLabel="Property"
                  />
                ) : (
                  <StaticFieldValue>{propertyLabel ?? "—"}</StaticFieldValue>
                )}
              </FormField>
            </CellAt>
            {/* Customer Name — user-typed, sits directly below the Property cell. */}
            <CellAt col={1} row={4} colSpan={8}>
              <FormField
                label="Customer Name"
                currentLength={editable ? draft.customerName.length : undefined}
                maxLength={editable ? WO_CUSTOMER_NAME_MAX : undefined}
              >
                <TextCell
                  editable={editable}
                  value={draft.customerName}
                  onChange={(value) => onFieldChange("customerName", value)}
                  maxLength={WO_CUSTOMER_NAME_MAX}
                />
              </FormField>
            </CellAt>
            {/* Address — snapshotted from the selected property on pick, then
                editable + detachable (auto-flows to the next full-width row,
                now row 5, beneath Customer Name). */}
            <AddressEditCell
              editable={editable}
              col={1}
              colSpan={8}
              ariaPrefix="Work order"
              value={{
                streetAddress: draft.streetAddress,
                city: draft.city,
                state: draft.state,
                zip: draft.zip,
              }}
              onChange={(field, value) => onFieldChange(field, value)}
            />
            <CellAt col={1} row={6} colSpan={8}>
              <FormField label="Property Instructions">
                <StaticFieldValue>
                  <span className="whitespace-pre-line">{instructionsDisplay}</span>
                </StaticFieldValue>
              </FormField>
            </CellAt>
            {/* Installer */}
            <CellAt col={1} row={7} colSpan={8}>
              <FormField
                label="Installer"
                currentLength={editable ? draft.installer.length : undefined}
                maxLength={editable ? WO_INSTALLER_MAX : undefined}
              >
                <TextCell
                  editable={editable}
                  value={draft.installer}
                  onChange={(value) => onFieldChange("installer", value)}
                  maxLength={WO_INSTALLER_MAX}
                />
              </FormField>
            </CellAt>
            {/* Installer Instructions */}
            <CellAt col={1} row={8} colSpan={8}>
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
                  rows={1}
                />
              </FormField>
            </CellAt>
          </FieldSection>
        }
        right={
          <FieldSection gap="0.75rem">
            {/* Schedule — Warehouse on top, then Job Type + Vacancy beneath */}
            <CellAt col={1} row={1} colSpan={4}>
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
            <CellAt col={5} row={2} colSpan={4}>
              <FormField label="Vacancy">
                <SegmentedChoiceCell
                  editable={editable}
                  value={draft.vacancy}
                  options={VACANCY_OPTIONS}
                  ariaLabel="Vacancy"
                  onChange={(value) => onFieldChange("vacancy", value as WorkOrderForm["vacancy"])}
                />
              </FormField>
            </CellAt>
            <CellAt col={1} row={2} colSpan={4}>
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
            {/* Scheduled For + Time of Day */}
            <CellAt col={1} row={3} colSpan={4}>
              <FormField label="Scheduled For">
                <DateCell
                  editable={editable}
                  value={draft.scheduledFor}
                  onChange={(value) => onFieldChange("scheduledFor", value)}
                />
              </FormField>
            </CellAt>
            <CellAt col={5} row={3} colSpan={4}>
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
            {/* Description */}
            <CellAt col={1} row={4} colSpan={8}>
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
                  rows={1}
                />
              </FormField>
            </CellAt>
            {/* Template → unit identity */}
            <CellAt col={1} row={5} colSpan={8}>
              <FormField
                label="Template"
                actions={
                  <>
                    <RecordOpenButton
                      ariaLabel="Open template record"
                      title="Open template record"
                      disabled={!templateValue}
                      onClick={() => {
                        if (templateValue) {
                          router.push(buildTemplateHubHref({ templateId: templateValue, returnTo }))
                        }
                      }}
                    />
                    {editable ? (
                      <CellAddButton
                        ariaLabel="New template"
                        title="New template"
                        onClick={() =>
                          router.push(buildRecordCreateHref("/dashboard/templates", { returnTo }))
                        }
                      />
                    ) : null}
                  </>
                }
              >
                {editable ? (
                  <TemplatePicker
                    value={templateValue}
                    onChange={() => {}}
                    onOptionSelected={handleTemplateSelected}
                    propertyId={propertyValue}
                    entityId={entityValue}
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
            <CellAt col={5} row={6} colSpan={4}>
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
            <CellAt col={1} row={7} colSpan={8}>
              <FormField
                label="Purchase Order Number"
                currentLength={editable ? draft.purchaseOrderNumber.length : undefined}
                maxLength={editable ? WO_PURCHASE_ORDER_NUMBER_MAX : undefined}
              >
                <TextCell
                  editable={editable}
                  value={draft.purchaseOrderNumber}
                  onChange={(value) => onFieldChange("purchaseOrderNumber", value)}
                  maxLength={WO_PURCHASE_ORDER_NUMBER_MAX}
                />
              </FormField>
            </CellAt>
            <CellAt col={1} row={8} colSpan={8}>
              <FormField
                label="Return"
                currentLength={editable ? draft.return.length : undefined}
                maxLength={editable ? WO_RETURN_MAX : undefined}
              >
                <TextCell
                  editable={editable}
                  value={draft.return}
                  onChange={(value) => onFieldChange("return", value)}
                  maxLength={WO_RETURN_MAX}
                />
              </FormField>
            </CellAt>
            <CellAt col={1} row={9} colSpan={8}>
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
                  rows={1}
                />
              </FormField>
            </CellAt>
          </FieldSection>
        }
      />
      <RecordSectionDivider />
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        <FormField label="Created">
          <StaticFieldValue>{detail ? formatEasternDateTime(detail.createdAt) || "—" : "—"}</StaticFieldValue>
        </FormField>
        <FormField label="Created by">
          <StaticFieldValue>{detail?.createdBy ?? "—"}</StaticFieldValue>
        </FormField>
        <FormField label="Updated">
          <StaticFieldValue>{detail ? formatEasternDateTime(detail.updatedAt) || "—" : "—"}</StaticFieldValue>
        </FormField>
        <FormField label="Updated by">
          <StaticFieldValue>{detail?.updatedBy ?? "—"}</StaticFieldValue>
        </FormField>
      </div>
      {printCounts && printCounts.length > 0 ? (
        <>
          <RecordSectionDivider />
          <FormField label="Print history">
            <div className="flex flex-col gap-1">
              {printCounts.map((entry) => (
                <div
                  key={entry.documentTypeName}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="text-neutral-700">{entry.documentTypeName}</span>
                  <span className="tabular-nums text-neutral-500">
                    {entry.count} print{entry.count === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
            </div>
          </FormField>
        </>
      ) : null}
    </div>
  )
}
