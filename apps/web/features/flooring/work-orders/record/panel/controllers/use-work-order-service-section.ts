"use client"

import { useCallback, useEffect, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import {
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordItemController,
  useRecordScopedSectionController,
} from "@/features/shared/engines/record-view"
import {
  clearRowFieldError,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import {
  type EditableServiceItem,
  type ServiceItemField,
  validateServiceItemFields,
} from "@/features/flooring/shared/line-items/service-items-editor"
import {
  areServiceItemsEqual,
  cloneServiceItems,
  createEmptyServiceItem,
} from "../shared"
import type { WorkOrderDetail } from "@/features/flooring/work-orders/types"

export function useWorkOrderServiceSection(input: {
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
  const [itemErrors, setItemErrors] = useState<RowFieldErrors<ServiceItemField>>({})

  const controller = useRecordScopedSectionController<EditableServiceItem[], EditableServiceItem[]>({
    currentUserId,
    recordId: workOrderId,
    sectionKey: "service",
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
        throw createRecordSectionError({
          kind: "validation",
          message: "Fix the highlighted service item fields before saving.",
        })
      }

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
                    id: isLocalOnlyRecordRow(item.id) ? null : item.id,
                    expectedUpdatedAt: isLocalOnlyRecordRow(item.id) ? null : item.updatedAt,
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
        return {
          serverValue: payload.workOrder.serviceItems,
          serverRevisionKey: payload.workOrder.updatedAt,
          noticeMessage: "Service section saved",
        }
      } catch (saveError) {
        applyConflictWorkOrderSnapshot(saveError)
        throw saveError instanceof Error ? saveError : new Error("Failed to save service section")
      }
    },
  })

  const itemController = useRecordItemController<EditableServiceItem>({
    setItems: controller.setLocalValue,
    getItemId: (item) => item.id,
  })

  const addItem = useCallback(() => {
    itemController.addItem(createEmptyServiceItem)
  }, [itemController])

  const changeField = useCallback(
    (itemId: string, field: keyof EditableServiceItem, value: string) => {
      itemController.updateItem(itemId, (item) => ({ ...item, [field]: value }))

      if (field === "name" || field === "unitId" || field === "quantity" || field === "unitPrice") {
        setItemErrors((previous) => clearRowFieldError(previous, itemId, field))
      }
    },
    [itemController],
  )

  const deleteItem = useCallback(
    (itemId: string) => {
      if (!confirmDelete("service item")) {
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
