"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { WorkOrderDocumentType } from "@builders/domain"
import { WorkOrderDocumentTypeRecordPanel } from "./work-order-document-type-record-panel"

export function WorkOrderDocumentTypeDetailClient({
  initialWorkOrderDocumentType,
  backHref,
  previousWorkOrderDocumentTypeId,
  nextWorkOrderDocumentTypeId,
}: {
  initialWorkOrderDocumentType: WorkOrderDocumentType
  backHref: string
  previousWorkOrderDocumentTypeId: string | null
  nextWorkOrderDocumentTypeId: string | null
}) {
  return (
    <RecordDetailClientScaffold
      title="Document Types Hub"
      backHref={backHref}
      headerVariant="section"
      dirtyMessage="You have unsaved document type changes. Leave this page without saving?"
    >
      {(page) => (
        <WorkOrderDocumentTypeRecordPanel
          page={page}
          entry={initialWorkOrderDocumentType}
          previousWorkOrderDocumentTypeId={previousWorkOrderDocumentTypeId}
          nextWorkOrderDocumentTypeId={nextWorkOrderDocumentTypeId}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
