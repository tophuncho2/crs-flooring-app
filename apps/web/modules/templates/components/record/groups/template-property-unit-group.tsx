"use client"

import { useCallback, useEffect, useState } from "react"
import { TextCell, TextareaCell } from "@/components/cells"
import { StaticFieldValue } from "@/components/fields"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"
import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"
import type { PropertyJoinedFields } from "@/modules/shared/property-fields"
import { PropertyHubSidePanel } from "@/modules/properties/components/side-panel/hub"
import {
  usePropertyHubSidePanel,
  type PropertyHubCreateResult,
} from "@/modules/properties/controllers/property-hub-side-panel"
import {
  buildAddressBlock,
  TEMPLATE_INSTALLER_INSTRUCTIONS_MAX,
  TEMPLATE_UNIT_TYPE_MAX,
  type PropertyOption,
  type TemplateForm,
} from "@builders/domain"
import type { TemplatePrimaryDetail } from "../template-primary-fields-section"
import { TemplateField } from "./template-field"
import { TemplateGroup } from "./template-group"

/**
 * Group 2: Property & Unit. Top sub-block is a two-column form
 * (Management Company + Property on the left, Unit Type on the right).
 * A thin divider separates that from the bottom block: read-only
 * property address + instructions + editable installer instructions,
 * full-width. Templates have no cascade rules — MC change does not
 * clear Property (different from WO).
 */
export function TemplatePropertyUnitGroup({
  editable,
  draft,
  detail,
  propertyJoined,
  onFieldChange,
  onPropertyOption,
}: {
  editable: boolean
  draft: TemplateForm
  detail: TemplatePrimaryDetail | null
  propertyJoined: PropertyJoinedFields | null
  onFieldChange: (field: keyof TemplateForm, value: string) => void
  onPropertyOption: (option: PropertyOption | null) => void
}) {
  const managementCompanyValue = draft.managementCompanyId || null
  const propertyValue = draft.propertyId || null

  const [pickedMcLabel, setPickedMcLabel] = useState<string | null>(null)
  const [pickedPropertyLabel, setPickedPropertyLabel] = useState<string | null>(null)

  useEffect(() => {
    setPickedMcLabel(null)
  }, [detail?.managementCompanyId])
  useEffect(() => {
    setPickedPropertyLabel(null)
  }, [detail?.propertyId])

  const managementCompanyLabel = pickedMcLabel ?? detail?.managementCompanyName ?? null
  const propertyLabel = pickedPropertyLabel ?? detail?.propertyName ?? null

  const handleHubCreated = useCallback(
    (result: PropertyHubCreateResult) => {
      const property = result.property
      if (!property) {
        if (result.managementCompany) {
          onFieldChange("managementCompanyId", result.managementCompany.id)
          setPickedMcLabel(result.managementCompany.name)
        }
        return
      }

      const mcId =
        result.managementCompany?.id ?? property.managementCompany?.id ?? ""
      const mcName =
        result.managementCompany?.name ?? property.managementCompany?.name ?? null

      onFieldChange("managementCompanyId", mcId)
      onFieldChange("propertyId", property.id)

      const syntheticOption: PropertyOption = {
        id: property.id,
        name: property.name,
        address: property.fullAddress,
        streetAddress: property.streetAddress,
        city: property.city,
        state: property.state,
        postalCode: property.zip,
        instructions: property.instructions,
        managementCompanyId:
          result.managementCompany?.id ?? property.managementCompany?.id ?? null,
      }
      onPropertyOption(syntheticOption)

      setPickedMcLabel(mcName)
      setPickedPropertyLabel(property.name)
    },
    [onFieldChange, onPropertyOption],
  )

  const hubPanel = usePropertyHubSidePanel({ onCreated: handleHubCreated })

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
        editable ? (
          <button
            type="button"
            aria-label="New property"
            onClick={hubPanel.open}
            className="inline-flex cursor-pointer items-center rounded-md border border-[var(--panel-border)] bg-transparent px-2.5 py-1 text-xs font-medium text-[var(--foreground)]/70 transition hover:bg-[var(--panel-border)]/30 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
          >
            + New property
          </button>
        ) : null
      }
    >
      <PropertyHubSidePanel controller={hubPanel} />
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <TemplateField label="Management Company">
              {editable ? (
                <ManagementCompanyPicker
                  value={managementCompanyValue}
                  onChange={(id) => onFieldChange("managementCompanyId", id ?? "")}
                  onOptionSelected={(option) => setPickedMcLabel(option?.name ?? null)}
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
