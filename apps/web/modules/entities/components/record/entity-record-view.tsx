"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  FormField,
  RecordDeleteDialog,
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  StaticFieldValue,
  useRecordDeleteConfirmation,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import { formatEasternDateTime, type EntityDetail } from "@builders/domain"
import {
  buildCurrentRecordEntryPath,
  buildPropertyRecordHref,
  buildRecordCreateHref,
} from "@/hooks/navigation/routes"
import { useEntityPrimarySection } from "@/modules/entities/controllers/record/primary/use-entity-primary-section"
import { LinkedPropertiesList } from "./properties/linked-properties-list"
import { EntityCellsSection } from "./primary/entity-cells-section"
import { EntityTemplatesSection } from "./templates/entity-templates-section"

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

  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

  const openProperty = (propertyId: string) => {
    router.push(buildPropertyRecordHref(propertyId, entry.id, returnTo))
  }

  // "+ Property" opens the single management form (the hub create flow),
  // pre-linked to this entity so the operator only fills the property fields.
  const createProperty = () => {
    router.push(
      buildRecordCreateHref("/dashboard/entities", {
        returnTo,
        params: { entityId: entry.id, entityLabel: entry.entity },
      }),
    )
  }

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
            <EntityCellsSection
              form={primary.localValue}
              editable={!primary.isSaving}
              onFieldChange={(field, value) =>
                primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
              }
              showTypes
              seedTypeRefs={entry.types}
              onTypeIdsChange={(typeIds) =>
                primary.setLocalValue((previous) => ({ ...previous, typeIds }))
              }
            />
            <div className="border-t border-[var(--panel-border)]" />
            <div className="flex gap-6">
              <FormField label="Created">
                <StaticFieldValue>{formatEasternDateTime(entry.createdAt) || "—"}</StaticFieldValue>
              </FormField>
              <FormField label="Updated">
                <StaticFieldValue>{formatEasternDateTime(entry.updatedAt) || "—"}</StaticFieldValue>
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
  ]

  return (
    <>
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
    </>
  )
}
