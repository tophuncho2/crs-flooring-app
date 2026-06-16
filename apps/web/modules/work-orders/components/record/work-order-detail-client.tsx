"use client"

import { useRouter } from "next/navigation"
import {
  RecordDetailClientScaffold,
  RecordStepperPortal,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type {
  EnrichedInventoryAdjustmentRow,
  WorkOrderDetail,
  WorkOrderNeighbor,
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
  const router = useRouter()
  const { previousWorkOrder, nextWorkOrder } = initialWorkOrder

  // The work-order record view is a full SSR route (not in-place selection like
  // inventory/templates), so stepping is a route navigation to the neighbor.
  // Carry `backHref` through as `returnTo` so the neighbor's back button lands
  // wherever this record's did. The portal's dirty-guard prompts before the push.
  const stepTo = (neighbor: WorkOrderNeighbor) => {
    const query = new URLSearchParams({ returnTo: backHref }).toString()
    router.push(`/dashboard/work-orders/${neighbor.id}?${query}`)
  }

  return (
    <RecordDetailClientScaffold
      title="Work Orders Hub"
      backHref={backHref}
      dirtyMessage="You have unsaved work-order changes. Leave this record without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <>
          {/* Top-bar stepper — walks the global work-order-number line. Mounted
              here off the SSR snapshot so the label/neighbors come straight from
              the loaded record; each step is a route nav to the neighbor. */}
          <RecordStepperPortal
            label={initialWorkOrder.workOrderNumber}
            isDirty={page.isDirty}
            discardMessage="This work order has unsaved changes. Stepping to another work order will discard them."
            onPrevious={previousWorkOrder ? () => stepTo(previousWorkOrder) : null}
            onNext={nextWorkOrder ? () => stepTo(nextWorkOrder) : null}
          />
          <WorkOrderRecordPanel
            page={page}
            entry={initialWorkOrder}
            initialMaterialItems={initialMaterialItems}
            initialAdjustmentsByWorkOrderItemId={initialAdjustmentsByWorkOrderItemId}
          />
        </>
      )}
    </RecordDetailClientScaffold>
  )
}
