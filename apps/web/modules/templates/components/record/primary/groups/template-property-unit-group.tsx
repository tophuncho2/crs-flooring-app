"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  CellAt,
  FormField,
  RecordOpenButton,
  StaticFieldValue,
  TextCell,
} from "@/engines/record-view"
import type { PropertyJoinedFields } from "@/engines/record-view"
import { CellAddButton } from "@/engines/common"
import { applyPropertySelection } from "@/engines/picker"
import {
  buildCurrentRecordEntryPath,
  buildPropertyRecordHref,
  buildRecordCreateHref,
  buildRecordDetailHref,
} from "@/hooks/navigation/routes"
import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"
import {
  buildAddressBlock,
  TEMPLATE_ACCOUNT_MANAGER_MAX,
  TEMPLATE_CUSTOMER_NAME_MAX,
  type PropertyOption,
  type TemplateForm,
} from "@builders/domain"
import type { TemplatePrimaryDetail } from "../template-primary-fields-section"

/**
 * Property & Unit field cluster, emitted as invisible-grid cells (no visual
 * group chrome). Entity is a read-only mirror of the picked
 * property's entity (templates no longer store their own). The open-record (launch)
 * and New property affordances live in each cell's label-row `actions` slot
 * (`RecordOpenButton` / a `CellAddButton` that opens the proper property create
 * form), mirroring the work-orders primary.
 *
 * Cascade rules come from the shared picker engine (`applyPropertySelection`):
 * picking a property back-fills its linked entity. `pickedMc` / `pickedPropertyLabel`
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
  /** Multi-field setter — used for the entity→Property cascade. */
  onFieldsChange: (patch: Partial<TemplateForm>) => void
  onPropertyOption: (option: PropertyOption | null) => void
}) {
  const propertyValue = draft.propertyId || null

  const [pickedPropertyLabel, setPickedPropertyLabel] = useState<string | null>(null)
  const [pickedMc, setPickedMc] = useState<{ id: string | null; name: string | null } | null>(null)

  // Apply a property option to the cell — the shared path for both the picker
  // and the quick-create modal: cascade-fill the draft, snapshot the label/entity,
  // and feed the read-only Address/Instructions mirror.
  const selectProperty = (option: PropertyOption | null) => {
    const patch = applyPropertySelection(option)
    onFieldsChange({ propertyId: patch.propertyId ?? "" })
    setPickedPropertyLabel(patch.propertyLabel ?? null)
    setPickedMc({
      id: option?.entityId ?? null,
      name: option?.entityName ?? null,
    })
    onPropertyOption(option)
  }

  // Reset the picked snapshots during render when the bound detail changes, so
  // the next record's saved names show immediately (previous-value tracking).
  const [trackedPropertyId, setTrackedPropertyId] = useState(detail?.propertyId)
  if (trackedPropertyId !== detail?.propertyId) {
    setTrackedPropertyId(detail?.propertyId)
    setPickedPropertyLabel(null)
    setPickedMc(null)
  }

  const entityLabel = pickedMc ? pickedMc.name : detail?.entityName ?? null
  const entityId = pickedMc ? pickedMc.id : detail?.entityId ?? null
  const propertyLabel = pickedPropertyLabel ?? detail?.propertyName ?? null
  // Open targets follow the live selection (draft propertyId, picked/saved entity).
  const openPropertyId = propertyValue ?? detail?.propertyId ?? null

  // Local nav for the cell open/add affordances (mirrors work-orders primary —
  // routing is injected here, not threaded from the panel).
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
    <>
      <CellAt col={1} row={2} colSpan={8}>
        <FormField
          label="Entity"
          actions={
            <RecordOpenButton
              ariaLabel="Open entity"
              title="Open entity"
              disabled={!entityId}
              onClick={() => {
                if (entityId) {
                  router.push(
                    buildRecordDetailHref(
                      "/dashboard/entities",
                      entityId,
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
                disabled={!openPropertyId}
                onClick={() => {
                  if (openPropertyId) {
                    router.push(buildPropertyRecordHref(openPropertyId, entityId, returnTo))
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
              onOptionSelected={selectProperty}
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
          maxLength={editable ? TEMPLATE_CUSTOMER_NAME_MAX : undefined}
        >
          <TextCell
            editable={editable}
            value={draft.customerName}
            onChange={(value) => onFieldChange("customerName", value)}
            maxLength={TEMPLATE_CUSTOMER_NAME_MAX}
          />
        </FormField>
      </CellAt>
      {/* Account Manager — user-typed, sits directly below Customer Name. */}
      <CellAt col={1} row={5} colSpan={8}>
        <FormField
          label="Account Manager"
          currentLength={editable ? draft.accountManager.length : undefined}
          maxLength={editable ? TEMPLATE_ACCOUNT_MANAGER_MAX : undefined}
        >
          <TextCell
            editable={editable}
            value={draft.accountManager}
            onChange={(value) => onFieldChange("accountManager", value)}
            maxLength={TEMPLATE_ACCOUNT_MANAGER_MAX}
          />
        </FormField>
      </CellAt>
      <CellAt col={1} row={6} colSpan={4}>
        <FormField label="Property Address">
          <StaticFieldValue>
            <span className="whitespace-pre-line">{addressDisplay}</span>
          </StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={5} row={6} colSpan={4}>
        <FormField label="Property Instructions">
          <StaticFieldValue>
            <span className="whitespace-pre-line">{instructionsDisplay}</span>
          </StaticFieldValue>
        </FormField>
      </CellAt>
    </>
  )
}
