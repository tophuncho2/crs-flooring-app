"use client"

import { useRouter } from "next/navigation"
import {
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  RecordStepperPortal,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import type { EntityType } from "@builders/domain"
import { useEntityTypePrimarySection } from "@/modules/entity-types/controllers/record/primary/use-entity-type-primary-section"
import { EntityTypePrimaryFieldsSection } from "./primary/entity-type-primary-fields-section"

export function EntityTypeRecordPanel({
  page,
  entry,
  previousEntityTypeId,
  nextEntityTypeId,
}: {
  page: RecordDetailClientScaffoldContext
  entry: EntityType
  previousEntityTypeId: string | null
  nextEntityTypeId: string | null
}) {
  const router = useRouter()
  const controller = useEntityTypePrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 10,
      dirtyLabel: "entity type",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Entity Type"
          showHeader={false}
          error={primary.error}
          noticeMessage={primary.noticeMessage}
          noticeError={primary.noticeError}
          isDirty={primary.isDirty}
          isSaving={primary.isSaving}
          hasConflict={primary.hasConflict}
          onSave={() => void primary.save()}
          onDiscard={primary.discard}
        >
          <EntityTypePrimaryFieldsSection
            draft={primary.localValue}
            editable={!primary.isSaving}
            onTypeChange={(value) =>
              primary.setLocalValue((previous) => ({ ...previous, type: value }))
            }
            onColorChange={(value) =>
              primary.setLocalValue((previous) => ({ ...previous, color: value }))
            }
            entityTypeNumber={record.entityTypeNumber}
            createdAt={record.createdAt}
            updatedAt={record.updatedAt}
            createdBy={record.createdBy}
            updatedBy={record.updatedBy}
          />
        </RecordPrimarySectionInstance>
      ),
    },
  ]

  return (
    <>
      {/* Walks the global ET-number line (◀ ET-n ▶) from the top bar. Entity-type
          detail is a per-id page, so a step router-navigates to the neighbor's
          page; the portal's dirty guard prompts first when edited. */}
      <RecordStepperPortal
        label={entry.entityTypeNumber}
        isDirty={page.isDirty}
        discardMessage="This entity type has unsaved changes. Stepping to another entity type will discard them."
        onPrevious={
          previousEntityTypeId
            ? () => router.push(`/dashboard/entity-types/${previousEntityTypeId}`)
            : null
        }
        onNext={
          nextEntityTypeId
            ? () => router.push(`/dashboard/entity-types/${nextEntityTypeId}`)
            : null
        }
      />
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
        deleteLabel="Delete Entity Type"
        confirmTitle="Delete entity type?"
        confirmMessage="This cannot be undone."
      />
    </>
  )
}
