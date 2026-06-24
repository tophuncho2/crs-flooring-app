"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  FormField,
  RecordDeleteDialog,
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  RecordStepperPortal,
  StaticFieldValue,
  useRecordDeleteConfirmation,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import {
  formatEasternDateTime,
  toEntityForm,
  type EntityDetail,
  type EntityForm,
  type EntityOption,
  type EntityTypeRef,
  type PropertyDetailRecord,
} from "@builders/domain"
import {
  buildCurrentRecordEntryPath,
  buildPropertyRecordHref,
  buildRecordDetailHref,
} from "@/hooks/navigation/routes"
import { usePropertyPrimarySection } from "@/modules/properties/controllers/record/use-property-primary-section"
import { PropertyFieldsSection } from "./primary/property-fields-section"
import { EntityPickerSection } from "./primary/entity-picker-section"
import { PropertyTemplatesSection } from "./templates/property-templates-section"

/** Hydrate the read-only contact cells from a freshly picked option. */
function toDisplayForm(option: EntityOption): EntityForm {
  return {
    entity: option.entity,
    streetAddress: option.streetAddress,
    city: option.city,
    state: option.state,
    zip: option.zip,
    phone: option.phone,
    email: option.email,
    // Entity options don't carry their linked types; chips show only for the
    // server-loaded linked entity (re-resolved on its own record view).
    typeIds: [],
  }
}

/**
 * The standalone Property record view. ① the entity — a live entity
 * picker (Company-Name cell) with its Phone/Email/Address shown read-only, above
 * the editable property cells; picking a company is a dirty edit saved with the
 * property, and the `RecordOpenButton` on the label hands off to the entity record
 * view — one section · ② the shared templates reference section (always shown),
 * with the property pre-seeded and locked — plus the entity when the property has one
 * — so only a template is choosable.
 *
 * Reached by clicking a property anywhere (the properties list, the entity record
 * view's property list, the WO/template "✎ Property" buttons) — it no longer
 * embeds inside the entity record view.
 */
export function PropertyRecordView({
  page,
  entry,
  entity,
}: {
  page: RecordDetailClientScaffoldContext
  entry: PropertyDetailRecord
  entity: EntityDetail | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const controller = usePropertyPrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record
  const deletion = useRecordDeleteConfirmation(controller.deleteRecord)

  const linkedEntity = record.entity

  // Record-view shell stepper (◀ PROP-# ▶). Properties live on a true SSR record
  // page, so stepping to a neighbor is a `router.push` of `?propertyId=` (which
  // re-runs the server loader for the neighbor + its entity). The existing `returnTo`
  // is preserved so "back" still lands on the original list across steps.
  const returnToParam = searchParams.get("returnTo")
  const stepPrevious = entry.previousProperty
  const stepNext = entry.nextProperty
  const stepTo = (id: string) =>
    router.push(buildPropertyRecordHref(id, null, returnToParam))

  // The picked entity id lives in the primary draft (dirty-tracked, saved with the
  // property). The contact cells read from local display state, seeded from the
  // server-loaded entity detail and refreshed when a different company is picked.
  const selectedEntityId = primary.localValue.entityId || null
  const [entityDisplay, setEntityDisplay] = useState<EntityForm | null>(
    entity ? toEntityForm(entity) : null,
  )
  const [entityLabel, setEntityLabel] = useState<string | null>(linkedEntity?.entity ?? null)
  // The linked entity's type chips (read-only). Seeded from the server-loaded
  // entity; cleared when a different entity is picked (options carry no types).
  const [entityTypeRefs, setEntityTypeRefs] = useState<EntityTypeRef[]>(
    entity?.types ?? [],
  )

  const selectEntity = (option: EntityOption | null) => {
    setEntityDisplay(option ? toDisplayForm(option) : null)
    setEntityLabel(option?.entity ?? null)
    setEntityTypeRefs([])
  }

  // A quick/proper-created company fills the cell exactly like a picked one: link
  // it in the dirty draft (saves with the property) and refresh the display cells.
  const handleEntityCreated = (option: EntityOption) => {
    primary.setLocalValue((previous) => ({
      ...previous,
      entityId: option.id,
    }))
    selectEntity(option)
  }

  const openEntity = () => {
    if (!selectedEntityId) return
    router.push(
      buildRecordDetailHref(
        "/dashboard/entities",
        selectedEntityId,
        buildCurrentRecordEntryPath(pathname, searchParams),
      ),
    )
  }

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 0,
      slot: "primary",
      dirtyLabel: "property",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Property"
          showHeader={false}
          error={primary.error}
          noticeMessage={primary.noticeMessage}
          noticeError={primary.noticeError}
          isDirty={primary.isDirty}
          isSaving={primary.isSaving}
          hasConflict={primary.hasConflict}
          onSave={() => void primary.save()}
          onDiscard={primary.discard}
          onDelete={deletion.requestDelete}
          deleteLabel="Delete Property"
        >
          <div className="flex flex-col gap-4">
            <EntityPickerSection
              value={selectedEntityId}
              onChange={(id) =>
                primary.setLocalValue((previous) => ({
                  ...previous,
                  entityId: id ?? "",
                }))
              }
              onOptionSelected={selectEntity}
              selectedLabel={entityLabel}
              display={entityDisplay}
              typeRefs={entityTypeRefs}
              editable={!primary.isSaving}
              onOpen={openEntity}
              returnTo={buildCurrentRecordEntryPath(pathname, searchParams)}
              onCreated={handleEntityCreated}
            />
            <div className="border-t border-[var(--panel-border)]" />
            <PropertyFieldsSection
              draft={primary.localValue}
              editable={!primary.isSaving}
              onFieldChange={(field, value) =>
                primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
              }
            />
            <div className="border-t border-[var(--panel-border)]" />
            <div className="flex gap-6">
              <FormField label="Property #">
                <StaticFieldValue>{entry.propertyNumber}</StaticFieldValue>
              </FormField>
              <FormField label="Created">
                <StaticFieldValue>{formatEasternDateTime(entry.createdAt) || "—"}</StaticFieldValue>
              </FormField>
              <FormField label="Updated">
                <StaticFieldValue>{formatEasternDateTime(entry.updatedAt) || "—"}</StaticFieldValue>
              </FormField>
              <FormField label="Created by">
                <StaticFieldValue>{entry.createdBy ?? "—"}</StaticFieldValue>
              </FormField>
              <FormField label="Updated by">
                <StaticFieldValue>{entry.updatedBy ?? "—"}</StaticFieldValue>
              </FormField>
            </div>
          </div>
        </RecordPrimarySectionInstance>
      ),
    },
  ]

  sections.push({
    key: "templates",
    type: "item",
    order: 20,
    render: () => (
      <PropertyTemplatesSection entity={linkedEntity} property={record} />
    ),
  })

  return (
    <>
      <RecordStepperPortal
        label={entry.propertyNumber}
        isDirty={page.isDirty}
        discardMessage="This property has unsaved changes. Stepping to another property will discard them."
        onPrevious={stepPrevious ? () => stepTo(stepPrevious.id) : null}
        onNext={stepNext ? () => stepTo(stepNext.id) : null}
      />
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter onClose={page.closePage} />
      <RecordDeleteDialog
        open={deletion.isOpen}
        isDeleting={deletion.isDeleting}
        title="Delete property?"
        message="This cannot be undone."
        onConfirm={() => void deletion.confirmDelete()}
        onCancel={deletion.cancelDelete}
      />
    </>
  )
}
