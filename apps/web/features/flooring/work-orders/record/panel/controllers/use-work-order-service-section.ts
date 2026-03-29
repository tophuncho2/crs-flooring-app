"use client"

import { useCallback, useEffect, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import {
  clearRowFieldError,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import {
  type EditableServiceItem,
  type ServiceItemField,
  validateServiceItemFields,
} from "@/features/flooring/shared/line-items/service-items-editor"
import { useWorkOrderSectionController } from "./use-work-order-section-controller"
import {
  areServiceItemsEqual,
  cloneServiceItems,
  createEmptyServiceItem,
  isLocalOnlyRow,
} from "../shared"
import type { WorkOrderDetail } from "@/features/flooring/work-orders/types"

export function useWorkOrderServiceSection(input: {
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
  const [itemErrors, setItemErrors] = useState<RowFieldErrors<ServiceItemField>>({})

  const controller = useWorkOrderSectionController<EditableServiceItem[], EditableServiceItem[]>({
    currentUserId,
    workOrderId,
    section: "service",
    serverValue: workOrder.serviceItems,
    serverRevisionKey: workOrder.updatedAt,
    createLocalValue: cloneServiceItems,
    cloneLocalValue: cloneServiceItems,
    isEqual: areServiceItemsEqual,
    onSave: async (items, _serverItems, serverRevisionKey) => {
      const nextErrors: RowFieldErrors<ServiceItemField> = {}

      for (const item of items) {
        const rowErrors = validateServiceItemFields({
          serviceId: item.serviceId,
          name: item.name,
          unitId: item.unitId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })
        if (Object.keys(rowErrors).length > 0) {
          nextErrors[item.id] = rowErrors
        }
      }

      setItemErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) {
        throw new Error("Fix the highlighted service item fields before saving.")
      }

      clearNotices()

      try {
        const payload = await requestJson<{ workOrder: WorkOrderDetail }>(
          `/api/flooring/work-orders/${workOrder.id}/service-items/section`,
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
                      serviceId: item.serviceId || null,
                      name: item.name || null,
                      unitId: item.unitId,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                      notes: item.notes || null,
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
        showSuccess("Service section saved")
        return {
          serverValue: payload.workOrder.serviceItems,
          serverRevisionKey: payload.workOrder.updatedAt,
        }
      } catch (saveError) {
        applyConflictWorkOrderSnapshot(saveError)
        throw saveError instanceof Error ? saveError : new Error("Failed to save service section")
      }
    },
  })

  const addItem = useCallback(() => {
    controller.setLocalValue((previous) => [...previous, createEmptyServiceItem()])
  }, [controller])

  const changeField = useCallback(
    (itemId: string, field: keyof EditableServiceItem, value: string) => {
      controller.setLocalValue((previous) => previous.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)))

      if (field === "name" || field === "unitId" || field === "quantity" || field === "unitPrice") {
        setItemErrors((previous) => clearRowFieldError(previous, itemId, field))
      }
    },
    [controller],
  )

  const deleteItem = useCallback(
    (itemId: string) => {
      if (!confirmDelete("service item")) {
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
