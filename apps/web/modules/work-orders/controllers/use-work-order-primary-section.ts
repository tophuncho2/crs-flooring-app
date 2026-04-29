"use client"

import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import {
  toWorkOrderForm,
  type WorkOrderDetail,
  type WorkOrderForm,
} from "@builders/domain"
import { toUpdateWorkOrderInput, validateWorkOrderPrimaryForm } from "./drafts"
import { useWorkOrdersListMutations } from "./use-work-orders-list-mutations"

export function useWorkOrderPrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: WorkOrderDetail
}) {
  const { updateWorkOrder, deleteWorkOrder } = useWorkOrdersListMutations()

  return useSingleSectionRecordController<WorkOrderDetail, WorkOrderForm>({
    page,
    scope: "work-orders",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/work-orders/${entry.id}`,
    payloadKey: "workOrder",
    createLocalValue: toWorkOrderForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validateWorkOrderPrimaryForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }
      const payload = await updateWorkOrder.mutateAsync({
        id: record.id,
        input: toUpdateWorkOrderInput(localValue),
        revisionKey: record.updatedAt,
      })
      return {
        serverValue: payload.workOrder,
        noticeMessage: "Work order saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteWorkOrder.mutateAsync({ id: record.id, updatedAt: record.updatedAt })
    },
    deleteErrorMessage: "Failed to delete work order",
  })
}
