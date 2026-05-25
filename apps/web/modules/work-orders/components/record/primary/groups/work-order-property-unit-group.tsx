"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, Pencil } from "lucide-react"
import { StaticFieldValue } from "@/components/fields"
import { SelectCell, TextCell, TextareaCell } from "@/components/cells"
import { buildRecordDetailHref } from "@/hooks/navigation/routes"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"
import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"
import { TemplatePicker } from "@/modules/templates/components/picker/template-picker"
import type { PropertyJoinedFields } from "@/components/composites/property-fields/property-joined-readonly-cells"
import { PropertyHubSidePanel } from "@/modules/properties/components/side-panel/hub"
import {
  usePropertyHubSidePanel,
  type PropertyHubCreateResult,
  type PropertyHubSaveResult,
} from "@/modules/properties/controllers/property-hub-side-panel"

const GROUP_HEADER_BUTTON_CLASS =
  "inline-flex cursor-pointer items-center rounded-md border border-[var(--panel-border)] bg-transparent px-2.5 py-1 text-xs font-medium text-[var(--foreground)]/70 transition hover:bg-[var(--panel-border)]/30 focus:outline-none focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
import {
  buildAddressBlock,
  WO_CUSTOM_ADDRESS_MAX,
  WO_INSTALLER_INSTRUCTIONS_MAX,
  WO_UNIT_NUMBER_MAX,
  WO_UNIT_TYPE_MAX,
  type PropertyOption,
  type WorkOrderForm,
} from "@builders/domain"
import { VACANCY_OPTIONS } from "../helpers"
import type { WorkOrderPrimaryDetail } from "../types"
import { WorkOrderField } from "./work-order-field"
import { WorkOrderGroup } from "./work-order-group"

/**
 * Group 2: Property & Unit. Top sub-block is a two-column form (cascade
 * pickers on the left, unit fields on the right). A thin divider
 * separates that from the bottom block: read-only property address +
 * editable custom address + installer instructions, full-width.
 *
 * Cascade rules (UI / local state only) — preserved from the prior
 * `WorkOrderPropertyFieldsBand`:
 *  - MC change/clear → clears propertyId + templateId
 *  - Property change/clear → clears templateId
 *  - Template change → no cascade
 *  - Template option-select also writes the template's unitType into
 *    the draft.
 */
export function WorkOrderPropertyUnitGroup({
  editable,
  draft,
  detail,
  propertyJoined,
  onFieldChange,
  onFieldsChange,
  onPropertyOption,
  onHubEntitySaved,
}: {
  editable: boolean
  draft: WorkOrderForm
  detail: WorkOrderPrimaryDetail | null
  propertyJoined: PropertyJoinedFields | null
  onFieldChange: <K extends keyof WorkOrderForm>(field: K, value: WorkOrderForm[K]) => void
  onFieldsChange: (patch: Partial<WorkOrderForm>) => void
  onPropertyOption: (option: PropertyOption | null) => void
  /**
   * Forwarded to the embedded hub panel: fires when the user saves an
   * MC or Property edit via the pencil buttons. The host record view
   * uses this to patch its joined fields without a full refetch.
   */
  onHubEntitySaved?: (result: PropertyHubSaveResult) => void
}) {
  const managementCompanyValue = draft.managementCompanyId || null
  const propertyValue = draft.propertyId || null
  const templateValue = draft.templateId || null

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
  const templateLabel = detail?.templateUnitType ? detail.templateUnitType : null

  const handleHubCreated = useCallback(
    (result: PropertyHubCreateResult) => {
      const property = result.property
      if (!property) {
        if (result.managementCompany) {
          onFieldsChange({ managementCompanyId: result.managementCompany.id })
          setPickedMcLabel(result.managementCompany.name)
        }
        return
      }

      const mcId =
        result.managementCompany?.id ?? property.managementCompany?.id ?? ""
      const mcName =
        result.managementCompany?.name ?? property.managementCompany?.name ?? null

      onFieldsChange({
        managementCompanyId: mcId,
        propertyId: property.id,
        templateId: "",
      })

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
    [onFieldsChange, onPropertyOption],
  )

  const handleHubSaved = useCallback(
    (result: PropertyHubSaveResult) => {
      // Drop the local label snapshots so the patched detail (which the
      // host record-view applies via patchRecord) becomes visible in the
      // picker triggers — they're only auto-cleared on a bound-id change.
      setPickedMcLabel(null)
      setPickedPropertyLabel(null)
      onHubEntitySaved?.(result)
    },
    [onHubEntitySaved],
  )

  const hubPanel = usePropertyHubSidePanel({
    onCreated: handleHubCreated,
    onSaved: handleHubSaved,
  })
  const router = useRouter()

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
    <WorkOrderGroup
      title="Property & Unit"
      headerRight={
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Edit management company"
            title="Edit management company"
            onClick={() => {
              if (managementCompanyValue) {
                void hubPanel.openForMcEditById(managementCompanyValue)
              }
            }}
            disabled={!managementCompanyValue}
            className={GROUP_HEADER_BUTTON_CLASS}
          >
            <Pencil size={12} className="mr-1" /> MC
          </button>
          <button
            type="button"
            aria-label="Edit property"
            title="Edit property"
            onClick={() => {
              if (propertyValue) {
                void hubPanel.openForPropertyEditById(propertyValue)
              }
            }}
            disabled={!propertyValue}
            className={GROUP_HEADER_BUTTON_CLASS}
          >
            <Pencil size={12} className="mr-1" /> Property
          </button>
          <button
            type="button"
            aria-label="Open template record"
            title="Open template record"
            onClick={() => {
              if (templateValue) {
                router.push(buildRecordDetailHref("/dashboard/templates", templateValue))
              }
            }}
            disabled={!templateValue}
            className={GROUP_HEADER_BUTTON_CLASS}
          >
            <ExternalLink size={12} className="mr-1" /> Template
          </button>
          {editable ? (
            <button
              type="button"
              aria-label="New property"
              onClick={hubPanel.open}
              className={GROUP_HEADER_BUTTON_CLASS}
            >
              + New property
            </button>
          ) : null}
        </div>
      }
    >
      <PropertyHubSidePanel controller={hubPanel} />
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <WorkOrderField label="Management Company">
              {editable ? (
                <ManagementCompanyPicker
                  value={managementCompanyValue}
                  onChange={(id) =>
                    onFieldsChange({
                      managementCompanyId: id ?? "",
                      propertyId: "",
                      templateId: "",
                    })
                  }
                  onOptionSelected={(option) => {
                    setPickedMcLabel(option?.name ?? null)
                    // Property cascade clears alongside MC change.
                    setPickedPropertyLabel(null)
                  }}
                  selectedLabel={managementCompanyLabel}
                  placeholder="—"
                  ariaLabel="Management company"
                />
              ) : (
                <StaticFieldValue>{managementCompanyLabel ?? "—"}</StaticFieldValue>
              )}
            </WorkOrderField>
            <WorkOrderField label="Property">
              {editable ? (
                <PropertyPicker
                  value={propertyValue}
                  onChange={(id) =>
                    onFieldsChange({ propertyId: id ?? "", templateId: "" })
                  }
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
            </WorkOrderField>
            <WorkOrderField label="Vacancy">
              <SelectCell
                editable={editable}
                value={draft.vacancy}
                options={VACANCY_OPTIONS}
                placeholder="—"
                onChange={(value) =>
                  onFieldChange("vacancy", value as WorkOrderForm["vacancy"])
                }
              />
            </WorkOrderField>
          </div>
          <div className="flex flex-col gap-3">
            <WorkOrderField label="Template">
              {editable ? (
                <TemplatePicker
                  value={templateValue}
                  onChange={(id) => onFieldChange("templateId", id ?? "")}
                  onOptionSelected={(option) => {
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
            </WorkOrderField>
            <WorkOrderField
              label="Unit Type"
              editable={editable}
              currentLength={draft.unitType.length}
              maxLength={WO_UNIT_TYPE_MAX}
            >
              <TextCell
                editable={editable}
                value={draft.unitType}
                onChange={(value) => onFieldChange("unitType", value)}
                maxLength={WO_UNIT_TYPE_MAX}
              />
            </WorkOrderField>
            <WorkOrderField
              label="Unit Number"
              editable={editable}
              currentLength={draft.unitNumber.length}
              maxLength={WO_UNIT_NUMBER_MAX}
            >
              <TextCell
                editable={editable}
                value={draft.unitNumber}
                onChange={(value) => onFieldChange("unitNumber", value)}
                maxLength={WO_UNIT_NUMBER_MAX}
              />
            </WorkOrderField>
          </div>
        </div>

        <div className="border-t border-[var(--panel-border)]/60" />

        <div className="flex flex-col gap-3">
          <WorkOrderField label="Property Address">
            <StaticFieldValue>
              <span className="whitespace-pre-line">{addressDisplay}</span>
            </StaticFieldValue>
          </WorkOrderField>
          <WorkOrderField label="Property Instructions">
            <StaticFieldValue>
              <span className="whitespace-pre-line">{instructionsDisplay}</span>
            </StaticFieldValue>
          </WorkOrderField>
          <WorkOrderField
            label="Custom Address"
            editable={editable}
            currentLength={draft.customAddress.length}
            maxLength={WO_CUSTOM_ADDRESS_MAX}
          >
            <TextareaCell
              editable={editable}
              value={draft.customAddress}
              onChange={(value) => onFieldChange("customAddress", value)}
              maxLength={WO_CUSTOM_ADDRESS_MAX}
              rows={2}
            />
          </WorkOrderField>
          <WorkOrderField
            label="Installer Instructions"
            editable={editable}
            currentLength={draft.installerInstructions.length}
            maxLength={WO_INSTALLER_INSTRUCTIONS_MAX}
          >
            <TextareaCell
              editable={editable}
              value={draft.installerInstructions}
              onChange={(value) => onFieldChange("installerInstructions", value)}
              maxLength={WO_INSTALLER_INSTRUCTIONS_MAX}
              rows={3}
            />
          </WorkOrderField>
        </div>
      </div>
    </WorkOrderGroup>
  )
}
