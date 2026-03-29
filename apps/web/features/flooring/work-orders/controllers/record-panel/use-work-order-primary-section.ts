"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import { useWorkOrderSectionController } from "@/features/flooring/work-orders/controllers/record-panel/use-work-order-section-controller"
import {
  areWorkOrderDraftsEqual,
  cloneDraftWorkOrder,
  toWorkOrderDraft,
} from "@/features/flooring/work-orders/controllers/record-panel/shared"
import type { DraftWorkOrder, WorkOrderDetail } from "@/features/flooring/work-orders/types"

export function useWorkOrderPrimarySection(input: {
  currentUserId: string
  workOrderId: string
  workOrder: WorkOrderDetail
  publishWorkOrder: (workOrder: WorkOrderDetail) => void
  onWorkOrderSaved?: (workOrder: WorkOrderDetail) => void
  clearNotices: () => void
  showSuccess: (message: string) => void
  applyConflictWorkOrderSnapshot: (error: unknown) => WorkOrderDetail | null
}) {
  const { currentUserId, workOrderId, workOrder, publishWorkOrder, onWorkOrderSaved, clearNotices, showSuccess, applyConflictWorkOrderSnapshot } =
    input

  return useWorkOrderSectionController<WorkOrderDetail, DraftWorkOrder>({
    currentUserId,
    workOrderId,
    section: "primary",
    serverValue: workOrder,
    serverRevisionKey: workOrder.updatedAt,
    createLocalValue: toWorkOrderDraft,
    cloneLocalValue: cloneDraftWorkOrder,
    isEqual: areWorkOrderDraftsEqual,
    onSave: async (nextDraft, serverWorkOrder, serverRevisionKey) => {
      clearNotices()

      try {
        const payload = await requestJson<{ workOrder: WorkOrderDetail }>(`/api/flooring/work-orders/${serverWorkOrder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withMutationMeta(nextDraft, serverRevisionKey)),
        })
        publishWorkOrder(payload.workOrder)
        onWorkOrderSaved?.(payload.workOrder)
        showSuccess("Work order fields saved")
        return {
          serverValue: payload.workOrder,
          serverRevisionKey: payload.workOrder.updatedAt,
        }
      } catch (saveError) {
        applyConflictWorkOrderSnapshot(saveError)
        throw saveError instanceof Error ? saveError : new Error("Failed to save work order")
      }
    },
  })
}
