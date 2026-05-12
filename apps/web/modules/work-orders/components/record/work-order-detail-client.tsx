"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/scaffolds/record-detail-client-scaffold"
import type {
  CutLogRow,
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import type { WorkOrderFileRow } from "@/modules/work-orders/data/queries"
import { WorkOrderRecordPanel } from "./work-order-record-panel"

export function WorkOrderDetailClient({
  initialWorkOrder,
  initialMaterialItems,
  initialCutLogsByWorkOrderItemId,
  initialFiles,
  backHref,
}: {
  initialWorkOrder: WorkOrderDetail
  initialMaterialItems: WorkOrderMaterialItemRow[]
  initialCutLogsByWorkOrderItemId: Record<string, CutLogRow[]>
  initialFiles: WorkOrderFileRow[]
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={initialWorkOrder.workOrderNumber}
      backHref={backHref}
      dirtyMessage="You have unsaved work-order changes. Leave this record without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <WorkOrderRecordPanel
          page={page}
          entry={initialWorkOrder}
          initialMaterialItems={initialMaterialItems}
          initialCutLogsByWorkOrderItemId={initialCutLogsByWorkOrderItemId}
          initialFiles={initialFiles}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
