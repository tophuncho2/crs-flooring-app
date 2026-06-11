"use client"

import { useState } from "react"
import { CellAt, FormField, StaticFieldValue, TextCell } from "@/engines/record-view"
import type { PropertyJoinedFields } from "@/engines/record-view"
import { applyPropertySelection } from "@/engines/picker"
import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"
import {
  buildAddressBlock,
  TEMPLATE_UNIT_TYPE_MAX,
  type PropertyOption,
  type TemplateForm,
} from "@builders/domain"
import type { TemplatePrimaryDetail } from "../template-primary-fields-section"

/**
 * Property & Unit field cluster, emitted as invisible-grid cells (no visual
 * group chrome). Management Company is a read-only mirror of the picked
 * property's MC (templates no longer store their own); the MC / Property /
 * + New property nav buttons now live in the primary header's Options menu
 * (see `template-record-panel`).
 *
 * Cascade rules come from the shared picker engine (`applyPropertySelection`):
 * picking a property back-fills its linked MC. `pickedMc` / `pickedPropertyLabel`
 * snapshot the picked option so the cells follow a re-select before save; both
 * reset when the bound detail record changes.
 */
export function TemplatePropertyUnitGroup({
  editable,
  draft,
  detail,
  propertyJoined,
  onFieldChange,
  onFieldsChange,
  onPropertyOption,
}: {
  editable: boolean
  draft: TemplateForm
  detail: TemplatePrimaryDetail | null
  propertyJoined: PropertyJoinedFields | null
  onFieldChange: (field: keyof TemplateForm, value: string) => void
  /** Multi-field setter — used for the MC→Property cascade. */
  onFieldsChange: (patch: Partial<TemplateForm>) => void
  onPropertyOption: (option: PropertyOption | null) => void
}) {
  const propertyValue = draft.propertyId || null

  const [pickedPropertyLabel, setPickedPropertyLabel] = useState<string | null>(null)
  const [pickedMc, setPickedMc] = useState<{ id: string | null; name: string | null } | null>(null)

  // Reset the picked snapshots during render when the bound detail changes, so
  // the next record's saved names show immediately (previous-value tracking).
  const [trackedPropertyId, setTrackedPropertyId] = useState(detail?.propertyId)
  if (trackedPropertyId !== detail?.propertyId) {
    setTrackedPropertyId(detail?.propertyId)
    setPickedPropertyLabel(null)
    setPickedMc(null)
  }

  const managementCompanyLabel = pickedMc ? pickedMc.name : detail?.managementCompanyName ?? null
  const propertyLabel = pickedPropertyLabel ?? detail?.propertyName ?? null

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
    <>
      <CellAt col={1} row={1} colSpan={4}>
        <FormField label="Management Company">
          <StaticFieldValue>{managementCompanyLabel ?? "—"}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={1} row={2} colSpan={4}>
        <FormField label="Property" required>
          {editable ? (
            <PropertyPicker
              value={propertyValue}
              onChange={() => {}}
              onOptionSelected={(option) => {
                const patch = applyPropertySelection(option)
                onFieldsChange({ propertyId: patch.propertyId ?? "" })
                setPickedPropertyLabel(patch.propertyLabel ?? null)
                // MC mirrors the chosen property (null when it has none).
                setPickedMc({
                  id: option?.managementCompanyId ?? null,
                  name: option?.managementCompanyName ?? null,
                })
                onPropertyOption(option)
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
      <CellAt col={1} row={3} colSpan={2}>
        <FormField label="Property Address">
          <StaticFieldValue>
            <span className="whitespace-pre-line">{addressDisplay}</span>
          </StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={3} row={3} colSpan={2}>
        <FormField label="Property Instructions">
          <StaticFieldValue>
            <span className="whitespace-pre-line">{instructionsDisplay}</span>
          </StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={1} row={4} colSpan={2}>
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
    </>
  )
}
