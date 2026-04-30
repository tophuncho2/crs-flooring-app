"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/scaffolds/record-detail-client-scaffold"
import type { WorkOrderDetail, WorkOrderMaterialItemRow } from "@builders/domain"
import type { WorkOrderFileRow, WorkOrderFormOptionSet } from "@/modules/work-orders/data/queries"
import { WorkOrderRecordPanel } from "./work-order-record-panel"

export function WorkOrderDetailClient({
  initialWorkOrder,
  initialMaterialItems,
  initialFiles,
  options,
  backHref,
}: {
  initialWorkOrder: WorkOrderDetail
  initialMaterialItems: WorkOrderMaterialItemRow[]
  initialFiles: WorkOrderFileRow[]
  options: WorkOrderFormOptionSet
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={`Work Order ${initialWorkOrder.workOrderNumber}`}
      backHref={backHref}
      dirtyMessage="You have unsaved work-order changes. Leave this record without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <WorkOrderRecordPanel
          page={page}
          entry={initialWorkOrder}
          initialMaterialItems={initialMaterialItems}
          initialFiles={initialFiles}
          options={options}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
