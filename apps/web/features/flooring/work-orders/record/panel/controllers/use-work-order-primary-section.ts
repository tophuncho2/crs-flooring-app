"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import { useRecordScopedSectionController } from "@/features/shared/engines/record-view"
import {
  areWorkOrderDraftsEqual,
  cloneDraftWorkOrder,
  toWorkOrderDraft,
} from "../shared"
import type { DraftWorkOrder, WorkOrderDetail } from "@/features/flooring/work-orders/types"

export function useWorkOrderPrimarySection(input: {
  currentUserId: string
  workOrderId: string
  workOrder: WorkOrderDetail
  publishWorkOrder: (workOrder: WorkOrderDetail) => void
  onWorkOrderSaved?: (workOrder: WorkOrderDetail) => void
  applyConflictWorkOrderSnapshot: (error: unknown) => WorkOrderDetail | null
}) {
  const { currentUserId, workOrderId, workOrder, publishWorkOrder, onWorkOrderSaved, applyConflictWorkOrderSnapshot } =
    input

  return useRecordScopedSectionController<WorkOrderDetail, DraftWorkOrder>({
    currentUserId,
    recordId: workOrderId,
    sectionKey: "primary",
    serverValue: workOrder,
    serverRevisionKey: workOrder.updatedAt,
    createLocalValue: toWorkOrderDraft,
    cloneLocalValue: cloneDraftWorkOrder,
    isEqual: areWorkOrderDraftsEqual,
    onSave: async (nextDraft, serverWorkOrder, serverRevisionKey) => {
      try {
        const payload = await requestJson<{ workOrder: WorkOrderDetail }>(`/api/flooring/work-orders/${serverWorkOrder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withMutationMeta(nextDraft, serverRevisionKey)),
        })
        publishWorkOrder(payload.workOrder)
        onWorkOrderSaved?.(payload.workOrder)
        return {
          serverValue: payload.workOrder,
          serverRevisionKey: payload.workOrder.updatedAt,
          noticeMessage: "Work order fields saved",
        }
      } catch (saveError) {
        applyConflictWorkOrderSnapshot(saveError)
        throw saveError instanceof Error ? saveError : new Error("Failed to save work order")
      }
    },
  })
}
