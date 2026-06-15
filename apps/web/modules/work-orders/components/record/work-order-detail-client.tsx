"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type {
  EnrichedInventoryAdjustmentRow,
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import { WorkOrderRecordPanel } from "./work-order-record-panel"

export function WorkOrderDetailClient({
  initialWorkOrder,
  initialMaterialItems,
  initialAdjustmentsByWorkOrderItemId,
  backHref,
}: {
  initialWorkOrder: WorkOrderDetail
  initialMaterialItems: WorkOrderMaterialItemRow[]
  initialAdjustmentsByWorkOrderItemId: Record<string, EnrichedInventoryAdjustmentRow[]>
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
          initialAdjustmentsByWorkOrderItemId={initialAdjustmentsByWorkOrderItemId}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
