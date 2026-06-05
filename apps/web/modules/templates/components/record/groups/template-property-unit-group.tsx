"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Pencil } from "lucide-react"
import { TextCell, TextareaCell } from "@/components/cells"
import { StaticFieldValue } from "@/components/fields"
import {
  buildCurrentRecordEntryPath,
  buildPropertyRecordHref,
  buildRecordCreateHref,
  buildRecordDetailHref,
} from "@/hooks/navigation/routes"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"
import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"
import type { PropertyJoinedFields } from "@/components/composites/property-fields/property-joined-readonly-cells"

import {
  buildAddressBlock,
  TEMPLATE_INSTALLER_INSTRUCTIONS_MAX,
  TEMPLATE_UNIT_TYPE_MAX,
  type PropertyOption,
  type TemplateForm,
} from "@builders/domain"
import type { TemplatePrimaryDetail } from "../template-primary-fields-section"
import { TemplateField } from "./template-field"
import { GROUP_HEADER_BUTTON_CLASS, TemplateGroup } from "./template-group"

/**
 * Group 2: Property & Unit. Top sub-block is a two-column form
 * (Management Company + Property on the left, Unit Type on the right).
 * A thin divider separates that from the bottom block: read-only
 * property address + instructions + editable installer instructions,
 * full-width.
 *
 * Cascade rule (UI / local state only) — mirrors WO's MC→Property
 * cascade: MC change/clear clears propertyId (and the picked-property
 * label snapshot), so a stale property tied to the prior MC doesn't
 * linger in the draft after switching companies.
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
  const managementCompanyValue = draft.managementCompanyId || null
  const propertyValue = draft.propertyId || null

  const [pickedMcLabel, setPickedMcLabel] = useState<string | null>(null)
  const [pickedPropertyLabel, setPickedPropertyLabel] = useState<string | null>(null)

  // Clear the picked-label snapshots when the bound detail ids change — done
  // during render (previous-value tracking) so the next record's saved names
  // show immediately instead of after a post-commit effect.
  const [trackedMcId, setTrackedMcId] = useState(detail?.managementCompanyId)
  if (trackedMcId !== detail?.managementCompanyId) {
    setTrackedMcId(detail?.managementCompanyId)
    setPickedMcLabel(null)
  }
  const [trackedPropertyId, setTrackedPropertyId] = useState(detail?.propertyId)
  if (trackedPropertyId !== detail?.propertyId) {
    setTrackedPropertyId(detail?.propertyId)
    setPickedPropertyLabel(null)
  }

  const managementCompanyLabel = pickedMcLabel ?? detail?.managementCompanyName ?? null
  const propertyLabel = pickedPropertyLabel ?? detail?.propertyName ?? null

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
    <TemplateGroup
      title="Property & Unit"
      headerRight={
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Open management company"
            title="Open management company"
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
            disabled={!managementCompanyValue}
            className={GROUP_HEADER_BUTTON_CLASS}
          >
            <Pencil size={12} className="mr-1" /> MC
          </button>
          <button
            type="button"
            aria-label="Open property"
            title="Open property"
            onClick={() => {
              if (propertyValue) {
                router.push(
                  buildPropertyRecordHref(propertyValue, managementCompanyValue, returnTo),
                )
              }
            }}
            disabled={!propertyValue}
            className={GROUP_HEADER_BUTTON_CLASS}
          >
            <Pencil size={12} className="mr-1" /> Property
          </button>
          {editable ? (
            <button
              type="button"
              aria-label="New property"
              onClick={() =>
                router.push(buildRecordCreateHref("/dashboard/properties", { returnTo }))
              }
              className={GROUP_HEADER_BUTTON_CLASS}
            >
              + New property
            </button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <TemplateField label="Management Company">
              {editable ? (
                <ManagementCompanyPicker
                  value={managementCompanyValue}
                  onChange={(id) =>
                    onFieldsChange({
                      managementCompanyId: id ?? "",
                      propertyId: "",
                    })
                  }
                  onOptionSelected={(option) => {
                    setPickedMcLabel(option?.name ?? null)
                    // Property cascade clears alongside MC change.
                    setPickedPropertyLabel(null)
                  }}
                  selectedLabel={managementCompanyLabel}
                  placeholder="No management company"
                  ariaLabel="Management company"
                />
              ) : (
                <StaticFieldValue>{managementCompanyLabel ?? "—"}</StaticFieldValue>
              )}
            </TemplateField>
            <TemplateField label="Property">
              {editable ? (
                <PropertyPicker
                  value={propertyValue}
                  onChange={(id) => onFieldChange("propertyId", id ?? "")}
                  onOptionSelected={(option) => {
                    setPickedPropertyLabel(option?.name ?? null)
                    onPropertyOption(option)
                  }}
                  managementCompanyId={managementCompanyValue}
                  selectedLabel={propertyLabel}
                  placeholder="Select property"
                  ariaLabel="Property"
                />
              ) : (
                <StaticFieldValue>{propertyLabel ?? "—"}</StaticFieldValue>
              )}
            </TemplateField>
          </div>
          <div className="flex flex-col gap-3">
            <TemplateField
              label="Unit Type"
              editable={editable}
              currentLength={draft.unitType.length}
              maxLength={TEMPLATE_UNIT_TYPE_MAX}
            >
              <TextCell
                editable={editable}
                value={draft.unitType}
                onChange={(value) => onFieldChange("unitType", value)}
                maxLength={TEMPLATE_UNIT_TYPE_MAX}
              />
            </TemplateField>
          </div>
        </div>

        <div className="border-t border-[var(--panel-border)]/60" />

        <div className="flex flex-col gap-3">
          <TemplateField label="Property Address">
            <StaticFieldValue>
              <span className="whitespace-pre-line">{addressDisplay}</span>
            </StaticFieldValue>
          </TemplateField>
          <TemplateField label="Property Instructions">
            <StaticFieldValue>
              <span className="whitespace-pre-line">{instructionsDisplay}</span>
            </StaticFieldValue>
          </TemplateField>
          <TemplateField
            label="Installer Instructions"
            editable={editable}
            currentLength={draft.installerInstructions.length}
            maxLength={TEMPLATE_INSTALLER_INSTRUCTIONS_MAX}
          >
            <TextareaCell
              editable={editable}
              value={draft.installerInstructions}
              onChange={(value) => onFieldChange("installerInstructions", value)}
              maxLength={TEMPLATE_INSTALLER_INSTRUCTIONS_MAX}
              rows={3}
            />
          </TemplateField>
        </div>
      </div>
    </TemplateGroup>
  )
}
