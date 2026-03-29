"use client"

import { useCallback, useEffect, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import {
  clearRowFieldError,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import {
  type EditableSalesRepItem,
  type SalesRepField,
  validateSalesRepFields,
} from "@/features/flooring/shared/line-items/sales-rep-items-editor"
import { useWorkOrderSectionController } from "@/features/flooring/work-orders/controllers/record-panel/use-work-order-section-controller"
import {
  areSalesRepItemsEqual,
  cloneSalesRepItems,
  createEmptySalesRepItem,
  isLocalOnlyRow,
} from "@/features/flooring/work-orders/controllers/record-panel/shared"
import type { WorkOrderDetail } from "@/features/flooring/work-orders/types"

export function useWorkOrderSalesRepsSection(input: {
  currentUserId: string
  workOrderId: string
  workOrder: WorkOrderDetail
  publishWorkOrder: (workOrder: WorkOrderDetail) => void
  clearNotices: () => void
  showSuccess: (message: string) => void
  applyConflictWorkOrderSnapshot: (error: unknown) => WorkOrderDetail | null
  confirmDelete: (label: string) => boolean
}) {
  const {
    currentUserId,
    workOrderId,
    workOrder,
    publishWorkOrder,
    clearNotices,
    showSuccess,
    applyConflictWorkOrderSnapshot,
    confirmDelete,
  } = input
  const [itemErrors, setItemErrors] = useState<RowFieldErrors<SalesRepField>>({})

  const controller = useWorkOrderSectionController<WorkOrderDetail["salesReps"], WorkOrderDetail["salesReps"]>({
    currentUserId,
    workOrderId,
    section: "sales",
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
        throw new Error("Fix the highlighted sales rep fields before saving.")
      }

      clearNotices()

      try {
        const payload = await requestJson<{ workOrder: WorkOrderDetail }>(
          `/api/flooring/work-orders/${workOrder.id}/sales-reps/section`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              withMutationMeta(
                {
                  items: items.map((item) => ({
                    id: isLocalOnlyRow(item.id) ? null : item.id,
                    expectedUpdatedAt: isLocalOnlyRow(item.id) ? null : item.updatedAt,
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
        showSuccess("Sales rep section saved")
        return {
          serverValue: payload.workOrder.salesReps,
          serverRevisionKey: payload.workOrder.updatedAt,
        }
      } catch (saveError) {
        applyConflictWorkOrderSnapshot(saveError)
        throw saveError instanceof Error ? saveError : new Error("Failed to save sales rep section")
      }
    },
  })

  const addItem = useCallback(() => {
    controller.setLocalValue((previous) => [...previous, createEmptySalesRepItem()])
  }, [controller])

  const changeField = useCallback(
    (itemId: string, field: keyof EditableSalesRepItem, value: string) => {
      controller.setLocalValue((previous) => previous.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)))

      if (field === "contactId" || field === "percent") {
        setItemErrors((previous) => clearRowFieldError(previous, itemId, field))
      }
    },
    [controller],
  )

  const deleteItem = useCallback(
    (itemId: string) => {
      if (!confirmDelete("sales rep")) {
        return
      }

      controller.setLocalValue((previous) => previous.filter((item) => item.id !== itemId))
      setItemErrors((previous) => {
        const next = { ...previous }
        delete next[itemId]
        return next
      })
    },
    [confirmDelete, controller],
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
