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
import type { WorkOrderDocumentType } from "@builders/domain"
import { useWorkOrderDocumentTypePrimarySection } from "@/modules/work-order-document-types/controllers/record/primary/use-work-order-document-type-primary-section"
import { WorkOrderDocumentTypePrimaryFieldsSection } from "./primary/work-order-document-type-primary-fields-section"

export function WorkOrderDocumentTypeRecordPanel({
  page,
  entry,
  previousWorkOrderDocumentTypeId,
  nextWorkOrderDocumentTypeId,
}: {
  page: RecordDetailClientScaffoldContext
  entry: WorkOrderDocumentType
  previousWorkOrderDocumentTypeId: string | null
  nextWorkOrderDocumentTypeId: string | null
}) {
  const router = useRouter()
  const controller = useWorkOrderDocumentTypePrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 10,
      dirtyLabel: "document type",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Document Type"
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
          <WorkOrderDocumentTypePrimaryFieldsSection
            draft={primary.localValue}
            editable={!primary.isSaving}
            onNameChange={(value) =>
              primary.setLocalValue((previous) => ({ ...previous, name: value }))
            }
            onColorChange={(value) =>
              primary.setLocalValue((previous) => ({ ...previous, color: value }))
            }
            onPrintConfigChange={(value) =>
              primary.setLocalValue((previous) => ({ ...previous, printConfig: value }))
            }
            workOrderDocumentTypeNumber={record.workOrderDocumentTypeNumber}
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
      {/* Walks the global ROW-number line (◀ ROW-n ▶) from the top bar. Doc-type
          detail is a per-id page, so a step router-navigates to the neighbor's
          page; the portal's dirty guard prompts first when edited. */}
      <RecordStepperPortal
        label={entry.workOrderDocumentTypeNumber}
        isDirty={page.isDirty}
        discardMessage="This document type has unsaved changes. Stepping to another document type will discard them."
        onPrevious={
          previousWorkOrderDocumentTypeId
            ? () =>
                router.push(
                  `/dashboard/work-order-document-types/${previousWorkOrderDocumentTypeId}`,
                )
            : null
        }
        onNext={
          nextWorkOrderDocumentTypeId
            ? () =>
                router.push(
                  `/dashboard/work-order-document-types/${nextWorkOrderDocumentTypeId}`,
                )
            : null
        }
      />
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
        deleteLabel="Delete Document Type"
        confirmTitle="Delete document type?"
        confirmMessage="This cannot be undone."
      />
    </>
  )
}
