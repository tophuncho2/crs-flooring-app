"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/scaffolds/record-detail-client-scaffold"
import type {
  InventoryAdjustmentRow,
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import { WorkOrderRecordPanel } from "./work-order-record-panel"

export function WorkOrderDetailClient({
  initialWorkOrder,
  initialMaterialItems,
  initialCutLogsByWorkOrderItemId,
  backHref,
}: {
  initialWorkOrder: WorkOrderDetail
  initialMaterialItems: WorkOrderMaterialItemRow[]
  initialCutLogsByWorkOrderItemId: Record<string, InventoryAdjustmentRow[]>
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
        />
      )}
    </RecordDetailClientScaffold>
  )
}
