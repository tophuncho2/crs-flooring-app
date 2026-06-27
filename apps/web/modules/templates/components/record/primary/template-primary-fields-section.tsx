"use client"

import { useState } from "react"
import {
  CellAt,
  FieldSection,
  FormField,
  RecordColumnBreak,
  RecordSectionDivider,
  StaticFieldValue,
  TextareaCell,
  TextCell,
} from "@/engines/record-view"
import { CellChip, PaletteColorDropdown } from "@/engines/common"
import { JobTypePicker } from "@/modules/job-types/components/picker/job-type-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import {
  formatEasternDateTime,
  TEMPLATE_DESCRIPTION_MAX,
  TEMPLATE_INSTALLER_INSTRUCTIONS_MAX,
  TEMPLATE_INTERNAL_NOTES_MAX,
  TEMPLATE_UNIT_TYPE_MAX,
  type PaletteColor,
  type TemplateForm,
} from "@builders/domain"
import { usePropertyJoinedOverride } from "@/modules/templates/controllers/record/primary/use-property-joined-override"
import { TemplatePropertyUnitGroup } from "./groups/template-property-unit-group"

/**
 * Slim joined-name + joined-property snapshot the section needs from
 * the saved template. Drives read-only label rendering and seeds the
 * pickers' `selectedLabel` so the trigger shows the saved selection
 * without a server round-trip. Pass `null` from create flows.
 */
export type TemplatePrimaryDetail = {
  templateNumber: string
  // Non-semantic palette tag — fills the Template # chip and seeds the edit-only
  // Color dropdown. Null detail (create flow) means no chip / no picker.
  color: PaletteColor
  propertyId: string | null
  propertyName: string
  propertyStreetAddress: string
  propertyCity: string
  propertyState: string
  propertyPostalCode: string
  propertyInstructions: string
  entityId: string | null
  entityName: string | null
  jobTypeId: string | null
  jobTypeName: string | null
  warehouseId: string | null
  warehouseName: string
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

/**
 * Composer for the templates primary section. Lays the fields across a centered
 * `RecordColumnBreak`: the left flank holds the Template #, Unit Type, and the
 * property cluster (entity / Property / Address / Instructions); the right flank
 * holds Warehouse + Job Type and the Description / Installer Instructions /
 * Internal Notes stack. A `RecordSectionDivider` then closes the section above a
 * 2×2 Created / Updated (+ actor) footer. Each flank is its own `FieldSection`
 * grid, so a tall side never drags the other's row spacing.
 */
export function TemplatePrimaryFieldsSection({
  draft,
  detail,
  disabled,
  onFieldChange,
  onFieldsChange,
}: {
  draft: TemplateForm
  detail: TemplatePrimaryDetail | null
  disabled: boolean
  onFieldChange: (field: keyof TemplateForm, value: string | PaletteColor) => void
  /** Multi-field setter — used by the property-unit cluster for the entity→Property cascade. */
  onFieldsChange: (patch: Partial<TemplateForm>) => void
}) {
  const editable = !disabled
  const { propertyJoined, handlePropertyOption } = usePropertyJoinedOverride(detail)

  // Snapshot the picked job-type label so it survives the dropdown preferring
  // `selectedOption` over its live results; falls back to the saved joined name.
  const [pickedJobTypeLabel, setPickedJobTypeLabel] = useState<string | null>(null)
  const jobTypeLabel = pickedJobTypeLabel ?? detail?.jobTypeName ?? null

  return (
    <div className="flex flex-col gap-4">
      <RecordColumnBreak
        left={
          <FieldSection gap="0.75rem">
            {/* Template Number — dedicated top row stamp. Read-only display.
                In edit (detail present) the number rides a palette-colored chip,
                like inventory's Inv # field; create (null detail) shows an em-dash. */}
            <CellAt col={1} row={1} colSpan={2}>
              <FormField label="Template #">
                {detail ? (
                  <CellChip paletteColor={detail.color}>{detail.templateNumber}</CellChip>
                ) : (
                  <StaticFieldValue>—</StaticFieldValue>
                )}
              </FormField>
            </CellAt>

            {/* Non-semantic palette tag — edit-only. The create flow (null detail)
                renders no picker, so new rows fall to the DB default SLATE. */}
            {detail ? (
              <CellAt col={7} row={1} colSpan={2}>
                <FormField label="Color">
                  <PaletteColorDropdown
                    value={draft.color}
                    editable={editable}
                    onChange={(next) => onFieldChange("color", next)}
                    ariaLabel="Template color"
                  />
                </FormField>
              </CellAt>
            ) : null}

            {/* Unit Type, then the property cluster — entity, Property, Address +
                Instructions — flowing down the break's left flank. */}
            <TemplatePropertyUnitGroup
              editable={editable}
              draft={draft}
              detail={detail}
              propertyJoined={draft.propertyId ? propertyJoined : null}
              onFieldChange={onFieldChange}
              onFieldsChange={onFieldsChange}
              onPropertyOption={handlePropertyOption}
            />
          </FieldSection>
        }
        right={
          <FieldSection gap="0.75rem">
            {/* Warehouse + Job Type on top, then the Description / Installer
                Instructions / Internal Notes stack down the right flank. */}
            <CellAt col={1} row={1} colSpan={4}>
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
            <CellAt col={5} row={1} colSpan={4}>
              <FormField label="Job Type">
                {editable ? (
                  <JobTypePicker
                    value={draft.jobTypeId || null}
                    onChange={(id) => onFieldChange("jobTypeId", id ?? "")}
                    onOptionSelected={(option) => setPickedJobTypeLabel(option?.name ?? null)}
                    selectedLabel={jobTypeLabel}
                    placeholder="No job type"
                    ariaLabel="Job type"
                  />
                ) : (
                  <StaticFieldValue>{jobTypeLabel ?? "—"}</StaticFieldValue>
                )}
              </FormField>
            </CellAt>
            {/* Unit Type — below Warehouse / Job Type, spanning half the flank. Required. */}
            <CellAt col={1} row={2} colSpan={4}>
              <FormField
                label="Unit Type"
                required
                currentLength={editable ? draft.unitType.length : undefined}
                maxLength={editable ? TEMPLATE_UNIT_TYPE_MAX : undefined}
              >
                <TextCell
                  editable={editable}
                  value={draft.unitType}
                  onChange={(value) => onFieldChange("unitType", value)}
                  maxLength={TEMPLATE_UNIT_TYPE_MAX}
                />
              </FormField>
            </CellAt>
            <CellAt col={1} row={3} colSpan={8}>
              <FormField
                label="Description"
                currentLength={editable ? draft.description.length : undefined}
                maxLength={editable ? TEMPLATE_DESCRIPTION_MAX : undefined}
              >
                <TextareaCell
                  editable={editable}
                  value={draft.description}
                  onChange={(value) => onFieldChange("description", value)}
                  maxLength={TEMPLATE_DESCRIPTION_MAX}
                  rows={1}
                />
              </FormField>
            </CellAt>
            <CellAt col={1} row={4} colSpan={8}>
              <FormField
                label="Installer Instructions"
                currentLength={editable ? draft.installerInstructions.length : undefined}
                maxLength={editable ? TEMPLATE_INSTALLER_INSTRUCTIONS_MAX : undefined}
              >
                <TextareaCell
                  editable={editable}
                  value={draft.installerInstructions}
                  onChange={(value) => onFieldChange("installerInstructions", value)}
                  maxLength={TEMPLATE_INSTALLER_INSTRUCTIONS_MAX}
                  rows={1}
                />
              </FormField>
            </CellAt>
            <CellAt col={1} row={5} colSpan={8}>
              <FormField
                label="Internal Notes"
                currentLength={editable ? draft.internalNotes.length : undefined}
                maxLength={editable ? TEMPLATE_INTERNAL_NOTES_MAX : undefined}
              >
                <TextareaCell
                  editable={editable}
                  value={draft.internalNotes}
                  onChange={(value) => onFieldChange("internalNotes", value)}
                  maxLength={TEMPLATE_INTERNAL_NOTES_MAX}
                  rows={1}
                />
              </FormField>
            </CellAt>
          </FieldSection>
        }
      />

      <RecordSectionDivider />

      {/* Read-only created / updated timestamps + the actor emails behind them,
          as a 2×2 footer. Null on historical / create-flow rows → em-dash. */}
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
    </div>
  )
}
