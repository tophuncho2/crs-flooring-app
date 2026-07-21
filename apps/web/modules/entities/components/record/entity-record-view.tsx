"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ChoiceDialog,
  FormField,
  RecordColumnBreak,
  RecordDeleteDialog,
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  RecordSectionDivider,
  RecordStepperPortal,
  StaticFieldValue,
  useRecordCreateChoice,
  useRecordDeleteConfirmation,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import { CellChip, PaletteColorDropdown } from "@/engines/common"
import { formatEasternDateTime, type EntityDetail } from "@builders/domain"
import {
  buildCurrentRecordEntryPath,
  buildPropertyRecordHref,
  buildRecordDetailHref,
} from "@/hooks/navigation/routes"
import { useEntityPrimarySection } from "@/modules/entities/controllers/record/primary/use-entity-primary-section"
import { LinkedPropertiesList } from "./properties/linked-properties-list"
import { PropertyHubQuickCreateModal } from "./properties/property-hub-quick-create-modal"
import { EntityCellsSection } from "./primary/entity-cells-section"
import { EntityTemplatesSection } from "./templates/entity-templates-section"
import { EntityWorkOrdersSection } from "./work-orders/entity-work-orders-section"

/**
 * The Entity record view. ① editable entity cells (primary) · ② the
 * linked-properties list — clicking a row **navigates** to that property's
 * standalone record view (no longer an inline drilldown); "+ Property" opens the
 * management form pre-linked to this entity · ③ the shared templates reference
 * section, scoped to this entity (its picker locked) with a selectable Property
 * filter, previewing a chosen template read-only.
 */
export function EntityRecordView({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: EntityDetail
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const controller = useEntityPrimarySection({ page, entry })
  const primary = controller.primarySection
  const deletion = useRecordDeleteConfirmation(controller.deleteRecord)
  const choice = useRecordCreateChoice()
  const [propertyModalOpen, setPropertyModalOpen] = useState(false)

  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

  // Record-view shell stepper (◀ ENT-# ▶). Entities live on a true SSR record
  // page, so stepping to a neighbor is a `router.push` of `?entityId=` (which
  // re-runs the server loader for the neighbor). The existing `returnTo` is
  // preserved so "back" still lands on the original list across steps.
  const returnToParam = searchParams.get("returnTo")
  const stepPrevious = entry.previousEntity
  const stepNext = entry.nextEntity
  const stepTo = (id: string) =>
    router.push(buildRecordDetailHref("/dashboard/entities", id, returnToParam))

  const openProperty = (propertyId: string) => {
    router.push(buildPropertyRecordHref(propertyId, entry.id, returnTo))
  }

  // "+ Property" opens the hub create form in a modal, with this entity seeded
  // and LOCKED (the operator only fills the property fields). On create the
  // choice dialog offers "Go to {property}" or stay in this entity.
  const createProperty = () => setPropertyModalOpen(true)

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 0,
      slot: "primary",
      dirtyLabel: "entity",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Entity"
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
          deleteLabel="Delete Entity"
        >
          <div className="flex flex-col gap-4">
            <RecordColumnBreak
              left={
                <EntityCellsSection
                  form={primary.localValue}
                  editable={!primary.isSaving}
                  onFieldChange={(field, value) =>
                    primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
                  }
                  showTypes
                  typesPosition="below"
                  seedTypeRef={entry.type}
                  onTypeIdChange={(typeId) =>
                    primary.setLocalValue((previous) => ({ ...previous, typeId }))
                  }
                  cellSpan={8}
                  nameRowLeading={
                    <FormField label="ENT #">
                      <CellChip paletteColor={primary.localValue.color}>
                        {entry.entityNumber}
                      </CellChip>
                    </FormField>
                  }
                  nameRowTrailing={
                    <FormField label="Color">
                      <PaletteColorDropdown
                        value={primary.localValue.color}
                        editable={!primary.isSaving}
                        onChange={(color) =>
                          primary.setLocalValue((previous) => ({ ...previous, color }))
                        }
                        ariaLabel="Entity color"
                      />
                    </FormField>
                  }
                />
              }
              right={null}
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
    {
      key: "properties",
      type: "item",
      order: 10,
      render: () => (
        <LinkedPropertiesList
          entityId={entry.id}
          onSelect={openProperty}
          onCreate={createProperty}
        />
      ),
    },
    {
      key: "templates",
      type: "item",
      order: 20,
      render: () => <EntityTemplatesSection entity={entry} />,
    },
    {
      key: "work-orders",
      type: "item",
      order: 30,
      render: () => <EntityWorkOrdersSection entity={entry} />,
    },
  ]

  return (
    <>
      <RecordStepperPortal
        label={entry.entityNumber}
        isDirty={page.isDirty}
        discardMessage="This entity has unsaved changes. Stepping to another entity will discard them."
        onPrevious={stepPrevious ? () => stepTo(stepPrevious.id) : null}
        onNext={stepNext ? () => stepTo(stepNext.id) : null}
      />
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter onClose={page.closePage} />
      <RecordDeleteDialog
        open={deletion.isOpen}
        isDeleting={deletion.isDeleting}
        title="Delete entity?"
        message={
          entry.propertyCount > 0
            ? `This will unlink ${entry.propertyCount} ${
                entry.propertyCount === 1 ? "property" : "properties"
              } from this entity. This cannot be undone.`
            : "This cannot be undone."
        }
        onConfirm={() => void deletion.confirmDelete()}
        onCancel={deletion.cancelDelete}
      />
      {propertyModalOpen ? (
        <PropertyHubQuickCreateModal
          open
          locked
          initialEntity={{ id: entry.id, label: entry.entity }}
          onClose={() => setPropertyModalOpen(false)}
          onCreated={(property) => {
            setPropertyModalOpen(false)
            choice.present({
              destinations: [
                {
                  label: `Go to ${property.name}`,
                  href: buildPropertyRecordHref(property.id, entry.id, returnTo),
                },
              ],
              stay: { label: "Stay here" },
            })
          }}
        />
      ) : null}
      {choice.choiceDialogProps ? <ChoiceDialog {...choice.choiceDialogProps} /> : null}
    </>
  )
}
