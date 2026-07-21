"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  FormField,
  RecordColumnBreak,
  RecordDeleteDialog,
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  RecordSectionDivider,
  RecordStepperPortal,
  StaticFieldValue,
  useRecordDeleteConfirmation,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import { CellChip, PaletteColorDropdown } from "@/engines/common"
import {
  DEFAULT_PALETTE_COLOR,
  formatEasternDateTime,
  toEntityForm,
  type EntityDetail,
  type EntityForm,
  type EntityOption,
  type EntityTypeRef,
  type PaletteColor,
  type PropertyDetailRecord,
} from "@builders/domain"
import {
  buildCurrentRecordEntryPath,
  buildPropertyRecordHref,
  buildRecordCreateHref,
  buildRecordDetailHref,
} from "@/hooks/navigation/routes"
import { usePropertyPrimarySection } from "@/modules/properties/controllers/record/use-property-primary-section"
import { PropertyFieldsSection } from "./primary/property-fields-section"
import { EntityPickerSection } from "./primary/entity-picker-section"
import { PropertyTemplatesSection } from "./templates/property-templates-section"
import { PropertyWorkOrdersSection } from "./work-orders/property-work-orders-section"

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
    // Contact-only display form: the type chip renders from `entityTypeRef`
    // (fed the option's `type`), not from this form's `typeId`.
    typeId: null,
    // Read-only contact display only — color is never shown/edited here, so the
    // default satisfies the form shape without implying a real value.
    color: DEFAULT_PALETTE_COLOR,
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
  // The linked entity's type chip (read-only). Seeded from the server-loaded
  // entity and refreshed from the picked option (which carries its type).
  const [entityTypeRef, setEntityTypeRef] = useState<EntityTypeRef | null>(
    entity?.type ?? null,
  )
  // The linked entity's ENT-# + palette color, mirrored read-only above the
  // Entity cell (parity with the entity record view). Seeded from the
  // server-loaded entity and refreshed from the picked option.
  const [entityNumber, setEntityNumber] = useState<string | null>(entity?.entityNumber ?? null)
  const [entityColor, setEntityColor] = useState<PaletteColor | null>(entity?.color ?? null)

  const selectEntity = (option: EntityOption | null) => {
    setEntityDisplay(option ? toDisplayForm(option) : null)
    setEntityLabel(option?.entity ?? null)
    setEntityTypeRef(option?.type ?? null)
    setEntityNumber(option?.entityNumber ?? null)
    setEntityColor(option?.color ?? null)
  }

  // Re-seed the read-only contact cells, trigger label, and type chips from the
  // server-loaded entity whenever the record swaps (stepper). Reset during render
  // and keyed on entry.id so a pick/save on the SAME record is never clobbered
  // (`entity` doesn't refetch on save — only on the stepper's SSR re-run).
  const [seenEntryId, setSeenEntryId] = useState(entry.id)
  if (seenEntryId !== entry.id) {
    setSeenEntryId(entry.id)
    setEntityDisplay(entity ? toEntityForm(entity) : null)
    setEntityLabel(linkedEntity?.entity ?? null)
    setEntityTypeRef(entity?.type ?? null)
    setEntityNumber(entity?.entityNumber ?? null)
    setEntityColor(entity?.color ?? null)
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
            <RecordColumnBreak
              left={
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
                  typeRef={entityTypeRef}
                  entityNumber={entityNumber}
                  entityColor={entityColor}
                  editable={!primary.isSaving}
                  onOpen={openEntity}
                  onCreate={() =>
                    router.push(
                      buildRecordCreateHref("/dashboard/entities", {
                        returnTo: buildCurrentRecordEntryPath(pathname, searchParams),
                      }),
                    )
                  }
                />
              }
              right={
                <PropertyFieldsSection
                  draft={primary.localValue}
                  editable={!primary.isSaving}
                  onFieldChange={(field, value) =>
                    primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
                  }
                  nameRowTrailing={
                    <FormField label="Property #">
                      <CellChip paletteColor={primary.localValue.color}>
                        {entry.propertyNumber}
                      </CellChip>
                    </FormField>
                  }
                  trailingFields={
                    <FormField label="Color">
                      <PaletteColorDropdown
                        value={primary.localValue.color}
                        editable={!primary.isSaving}
                        onChange={(color) =>
                          primary.setLocalValue((previous) => ({ ...previous, color }))
                        }
                        ariaLabel="Property color"
                      />
                    </FormField>
                  }
                />
              }
            />
            <RecordSectionDivider />
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <FormField label="Created">
                <StaticFieldValue>{formatEasternDateTime(entry.createdAt) || "—"}</StaticFieldValue>
              </FormField>
              <FormField label="Created by">
                <StaticFieldValue>{entry.createdBy ?? "—"}</StaticFieldValue>
              </FormField>
              <FormField label="Updated">
                <StaticFieldValue>{formatEasternDateTime(entry.updatedAt) || "—"}</StaticFieldValue>
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

  sections.push({
    key: "work-orders",
    type: "item",
    order: 30,
    render: () => <PropertyWorkOrdersSection property={record} />,
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
