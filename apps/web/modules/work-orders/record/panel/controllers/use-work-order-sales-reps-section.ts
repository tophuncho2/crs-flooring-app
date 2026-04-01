"use client"

import { useCallback, useEffect, useState } from "react"
import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import {
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordItemController,
  useRecordScopedSectionController,
} from "@/modules/shared/engines/record-view"
import {
  clearRowFieldError,
  type RowFieldErrors,
} from "@/modules/shared/engines/record-view/feedback/record-field-errors"
import {
  type EditableSalesRepItem,
  type SalesRepField,
  validateSalesRepFields,
} from "@/modules/shared/engines/record-view/line-items/sales-rep-items-editor"
import {
  areSalesRepItemsEqual,
  cloneSalesRepItems,
  createEmptySalesRepItem,
} from "../shared"
import type { WorkOrderDetail } from "@/modules/work-orders/types"

export function useWorkOrderSalesRepsSection(input: {
  currentUserId: string
  workOrderId: string
  workOrder: WorkOrderDetail
  publishWorkOrder: (workOrder: WorkOrderDetail) => void
  applyConflictWorkOrderSnapshot: (error: unknown) => WorkOrderDetail | null
  confirmDelete: (label: string) => boolean
}) {
  const {
    currentUserId,
    workOrderId,
    workOrder,
    publishWorkOrder,
    applyConflictWorkOrderSnapshot,
    confirmDelete,
  } = input
  const [itemErrors, setItemErrors] = useState<RowFieldErrors<SalesRepField>>({})

  const controller = useRecordScopedSectionController<WorkOrderDetail["salesReps"], WorkOrderDetail["salesReps"]>({
    currentUserId,
    recordId: workOrderId,
    sectionKey: "sales",
    serverValue: workOrder.salesReps,
    serverRevisionKey: workOrder.updatedAt,
    createLocalValue: cloneSalesRepItems,
    cloneLocalValue: cloneSalesRepItems,
    isEqual: areSalesRepItemsEqual,
    onSave: async (items, _serverItems, serverRevisionKey) => {
      const nextErrors: RowFieldErrors<SalesRepField> = {}

      for (const item of items) {
        const rowErrors = validateSalesRepFields({
          contactId: item.contactId,
          percent: item.percent,
        })
        if (Object.keys(rowErrors).length > 0) {
          nextErrors[item.id] = rowErrors
        }
      }

      setItemErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Fix the highlighted sales rep fields before saving.",
        })
      }

      try {
        const payload = await requestJson<{ workOrder: WorkOrderDetail }>(
          `/api/work-orders/${workOrder.id}/sales-reps/section`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              withMutationMeta(
                {
                  items: items.map((item) => ({
                    id: isLocalOnlyRecordRow(item.id) ? null : item.id,
                    expectedUpdatedAt: isLocalOnlyRecordRow(item.id) ? null : item.updatedAt,
                    item: {
                      contactId: item.contactId,
                      percent: item.percent,
                    },
                  })),
                },
                serverRevisionKey,
              ),
            ),
          },
        )
        setItemErrors({})
        publishWorkOrder(payload.workOrder)
        return {
          serverValue: payload.workOrder.salesReps,
          serverRevisionKey: payload.workOrder.updatedAt,
          noticeMessage: "Sales rep section saved",
        }
      } catch (saveError) {
        applyConflictWorkOrderSnapshot(saveError)
        throw saveError instanceof Error ? saveError : new Error("Failed to save sales rep section")
      }
    },
  })

  const itemController = useRecordItemController<EditableSalesRepItem>({
    setItems: controller.setLocalValue,
    getItemId: (item) => item.id,
  })

  const addItem = useCallback(() => {
    itemController.addItem(createEmptySalesRepItem)
  }, [itemController])

  const changeField = useCallback(
    (itemId: string, field: keyof EditableSalesRepItem, value: string) => {
      itemController.updateItem(itemId, (item) => ({ ...item, [field]: value }))

      if (field === "contactId" || field === "percent") {
        setItemErrors((previous) => clearRowFieldError(previous, itemId, field))
      }
    },
    [itemController],
  )

  const deleteItem = useCallback(
    (itemId: string) => {
      if (!confirmDelete("sales rep")) {
        return
      }

      itemController.removeItem(itemId)
      setItemErrors((previous) => {
        const next = { ...previous }
        delete next[itemId]
        return next
      })
    },
    [confirmDelete, itemController],
  )

  useEffect(() => {
    if (!controller.isDirty) {
      setItemErrors({})
    }
  }, [controller.isDirty])

  return {
    ...controller,
    itemErrors,
    addItem,
    changeField,
    deleteItem,
  }
}
