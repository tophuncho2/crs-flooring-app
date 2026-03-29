"use client"

import { useCallback, useEffect, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import {
  clearRowFieldError,
  setRowFieldErrors,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import {
  type EditableMaterialItem,
  type MaterialItemField,
  type MaterialItemOption,
  validateMaterialItemFields,
} from "@/features/flooring/shared/line-items/material-items-editor"
import { useWorkOrderSectionController } from "./use-work-order-section-controller"
import {
  areMaterialItemsEqual,
  cloneMaterialItems,
  createEmptyAllocationRow,
  createEmptyMaterialItem,
  isLocalOnlyRow,
  reconcileMaterialItemDraft,
} from "../shared"
import {
  validateAllocationFields,
  type AllocationField,
} from "../sections/material-allocations-editor"
import type {
  InventoryAllocationOption,
  WorkOrderDetail,
  WorkOrderItemAllocationRow,
  WorkOrderMaterialItem,
} from "@/features/flooring/work-orders/types"

export function useWorkOrderMaterialSection(input: {
  currentUserId: string
  workOrderId: string
  workOrder: WorkOrderDetail
  productOptions: MaterialItemOption[]
  publishWorkOrder: (workOrder: WorkOrderDetail) => void
  clearNotices: () => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
  applyConflictWorkOrderSnapshot: (error: unknown) => WorkOrderDetail | null
  confirmDelete: (label: string) => boolean
}) {
  const {
    currentUserId,
    workOrderId,
    workOrder,
    productOptions,
    publishWorkOrder,
    clearNotices,
    showSuccess,
    showError,
    applyConflictWorkOrderSnapshot,
    confirmDelete,
  } = input
  const [itemErrors, setItemErrors] = useState<RowFieldErrors<MaterialItemField>>({})
  const [allocationErrorsByItemId, setAllocationErrorsByItemId] = useState<Record<string, RowFieldErrors<AllocationField>>>({})
  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([])
  const [allocationOptionsByItemId, setAllocationOptionsByItemId] = useState<Record<string, InventoryAllocationOption[]>>({})
  const [loadingAllocationOptionsByItemId, setLoadingAllocationOptionsByItemId] = useState<Record<string, boolean>>({})

  const controller = useWorkOrderSectionController<WorkOrderMaterialItem[], WorkOrderMaterialItem[]>({
    currentUserId,
    workOrderId,
    section: "material",
    serverValue: workOrder.items,
    serverRevisionKey: workOrder.updatedAt,
    createLocalValue: cloneMaterialItems,
    cloneLocalValue: cloneMaterialItems,
    isEqual: areMaterialItemsEqual,
    onSave: async (items, _serverItems, serverRevisionKey) => {
      const nextItemErrors: RowFieldErrors<MaterialItemField> = {}
      const nextAllocationErrors: Record<string, RowFieldErrors<AllocationField>> = {}

      for (const item of items) {
        const rowErrors = validateMaterialItemFields({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })
        if (Object.keys(rowErrors).length > 0) {
          nextItemErrors[item.id] = rowErrors
        }

        const allocationErrors: RowFieldErrors<AllocationField> = {}
        for (const allocation of item.allocations) {
          const rowAllocationErrors = validateAllocationFields({
            inventoryId: allocation.inventoryId,
            quantity: allocation.quantity,
          })
          if (Object.keys(rowAllocationErrors).length > 0) {
            allocationErrors[allocation.id] = rowAllocationErrors
          }
        }

        if (Object.keys(allocationErrors).length > 0) {
          nextAllocationErrors[item.id] = allocationErrors
        }
      }

      setItemErrors(nextItemErrors)
      setAllocationErrorsByItemId(nextAllocationErrors)

      if (Object.keys(nextItemErrors).length > 0 || Object.keys(nextAllocationErrors).length > 0) {
        throw new Error("Fix the highlighted material item and allocation fields before saving.")
      }

      clearNotices()

      try {
        const payload = await requestJson<{ workOrder: WorkOrderDetail }>(
          `/api/flooring/work-orders/${workOrder.id}/items/section`,
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
                      productId: item.productId,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                      notes: item.notes || null,
                    },
                    allocations: item.allocations.map((allocation) => ({
                      id: isLocalOnlyRow(allocation.id) ? null : allocation.id,
                      expectedUpdatedAt: isLocalOnlyRow(allocation.id) ? null : allocation.updatedAt,
                      input: {
                        inventoryId: allocation.inventoryId,
                        quantity: allocation.quantity,
                        cutSize: allocation.cutSize || null,
                        notes: allocation.notes || null,
                      },
                    })),
                  })),
                },
                serverRevisionKey,
              ),
            ),
          },
        )
        setItemErrors({})
        setAllocationErrorsByItemId({})
        publishWorkOrder(payload.workOrder)
        showSuccess("Material section saved")
        return {
          serverValue: payload.workOrder.items,
          serverRevisionKey: payload.workOrder.updatedAt,
        }
      } catch (saveError) {
        applyConflictWorkOrderSnapshot(saveError)
        throw saveError instanceof Error ? saveError : new Error("Failed to save material section")
      }
    },
  })

  const loadAllocationOptions = useCallback(
    async (itemId: string, productId: string) => {
      if (!productId) {
        setAllocationOptionsByItemId((previous) => ({ ...previous, [itemId]: [] }))
        return []
      }

      setLoadingAllocationOptionsByItemId((previous) => ({ ...previous, [itemId]: true }))
      try {
        const payload = await requestJson<{ options: InventoryAllocationOption[] }>(
          `/api/flooring/work-orders/${workOrderId}/allocation-options?productId=${productId}`,
          { cache: "no-store" },
        )
        setAllocationOptionsByItemId((previous) => ({ ...previous, [itemId]: payload.options }))
        return payload.options
      } finally {
        setLoadingAllocationOptionsByItemId((previous) => ({ ...previous, [itemId]: false }))
      }
    },
    [workOrderId],
  )

  const addItem = useCallback(() => {
    const nextItem = createEmptyMaterialItem()
    controller.setLocalValue((previous) => [...previous, nextItem])
    setExpandedItemIds((previous) => (previous.includes(nextItem.id) ? previous : [...previous, nextItem.id]))
  }, [controller])

  const toggleExpandedItem = useCallback(
    (itemId: string) => {
      setExpandedItemIds((previous) => {
        const isExpanded = previous.includes(itemId)
        if (isExpanded) {
          return previous.filter((value) => value !== itemId)
        }

        const item = controller.localValue.find((value) => value.id === itemId)
        if (item?.productId) {
          void loadAllocationOptions(itemId, item.productId)
        }

        return [...previous, itemId]
      })
    },
    [controller.localValue, loadAllocationOptions],
  )

  const changeItemField = useCallback(
    (itemId: string, field: keyof EditableMaterialItem, value: string) => {
      controller.setLocalValue((previous) =>
        previous.map((item) => {
          if (item.id !== itemId) {
            return item
          }

          if (field === "productId") {
            const selectedProduct = productOptions.find((product) => product.id === value)
            setAllocationOptionsByItemId((current) => ({ ...current, [itemId]: [] }))
            setAllocationErrorsByItemId((current) => {
              const next = { ...current }
              delete next[itemId]
              return next
            })
            return reconcileMaterialItemDraft({
              ...item,
              productId: value,
              productName: selectedProduct?.label ?? "",
              sendUnit: selectedProduct?.sendUnit ?? "",
              allocations: [],
            })
          }

          return reconcileMaterialItemDraft({
            ...item,
            [field]: value,
          })
        }),
      )

      if (field === "productId" || field === "quantity" || field === "unitPrice") {
        setItemErrors((previous) => clearRowFieldError(previous, itemId, field))
      }
    },
    [controller, productOptions],
  )

  const addAllocation = useCallback(
    async (itemId: string) => {
      const item = controller.localValue.find((value) => value.id === itemId)
      if (!item) {
        return
      }

      if (!item.productId) {
        showError("Select a product before adding allocations.")
        return
      }

      await loadAllocationOptions(item.id, item.productId)
      controller.setLocalValue((previous) =>
        previous.map((value) =>
          value.id === itemId
            ? reconcileMaterialItemDraft({
                ...value,
                allocations: [...value.allocations, createEmptyAllocationRow(itemId)],
              })
            : value,
        ),
      )
    },
    [controller, loadAllocationOptions, showError],
  )

  const changeAllocationField = useCallback(
    (itemId: string, allocationId: string, field: keyof WorkOrderItemAllocationRow, value: string) => {
      const options = allocationOptionsByItemId[itemId] ?? []

      controller.setLocalValue((previous) =>
        previous.map((item) => {
          if (item.id !== itemId) {
            return item
          }

          const allocations = item.allocations.map((allocation) => {
            if (allocation.id !== allocationId) {
              return allocation
            }

            if (field === "inventoryId") {
              const selectedOption = options.find((option) => option.id === value)
              return {
                ...allocation,
                inventoryId: value,
                unitCost: String(selectedOption?.pricePerUnit ?? allocation.unitCost),
                inventory: {
                  itemNumber: selectedOption?.itemNumber ?? "",
                  dyeLot: selectedOption?.dyeLot ?? "",
                  locationCode: selectedOption?.locationCode ?? "",
                  warehouseName: selectedOption?.warehouseName ?? "",
                  stockUnit: selectedOption?.stockUnit ?? "",
                },
              }
            }

            return {
              ...allocation,
              [field]: value,
            }
          })

          return reconcileMaterialItemDraft({
            ...item,
            allocations,
          })
        }),
      )

      if (field === "inventoryId" || field === "quantity") {
        setAllocationErrorsByItemId((previous) => ({
          ...previous,
          [itemId]: clearRowFieldError(previous[itemId] ?? {}, allocationId, field),
        }))
      }
    },
    [allocationOptionsByItemId, controller],
  )

  const deleteItem = useCallback(
    (itemId: string) => {
      if (!confirmDelete("material item")) {
        return
      }

      controller.setLocalValue((previous) => previous.filter((item) => item.id !== itemId))
      setItemErrors((previous) => {
        const next = { ...previous }
        delete next[itemId]
        return next
      })
      setAllocationErrorsByItemId((previous) => {
        const next = { ...previous }
        delete next[itemId]
        return next
      })
      setAllocationOptionsByItemId((previous) => {
        const next = { ...previous }
        delete next[itemId]
        return next
      })
      setExpandedItemIds((previous) => previous.filter((value) => value !== itemId))
    },
    [confirmDelete, controller],
  )

  const deleteAllocation = useCallback(
    (itemId: string, allocationId: string) => {
      controller.setLocalValue((previous) =>
        previous.map((item) =>
          item.id === itemId
            ? reconcileMaterialItemDraft({
                ...item,
                allocations: item.allocations.filter((allocation) => allocation.id !== allocationId),
              })
            : item,
        ),
      )

      setAllocationErrorsByItemId((previous) => ({
        ...previous,
        [itemId]: setRowFieldErrors(previous[itemId] ?? {}, allocationId, {}),
      }))
    },
    [controller],
  )

  useEffect(() => {
    if (!controller.isDirty) {
      setItemErrors({})
      setAllocationErrorsByItemId({})
    }
  }, [controller.isDirty])

  useEffect(() => {
    const currentItemIds = new Set(controller.localValue.map((item) => item.id))

    setExpandedItemIds((previous) => previous.filter((itemId) => currentItemIds.has(itemId)))
    setAllocationOptionsByItemId((previous) =>
      Object.fromEntries(Object.entries(previous).filter(([itemId]) => currentItemIds.has(itemId))),
    )
    setLoadingAllocationOptionsByItemId((previous) =>
      Object.fromEntries(Object.entries(previous).filter(([itemId]) => currentItemIds.has(itemId))),
    )
  }, [controller.localValue])

  return {
    ...controller,
    itemErrors,
    allocationErrorsByItemId,
    expandedItemIds,
    allocationOptionsByItemId,
    loadingAllocationOptionsByItemId,
    addItem,
    toggleExpandedItem,
    changeItemField,
    deleteItem,
    addAllocation,
    changeAllocationField,
    deleteAllocation,
    loadAllocationOptions,
  }
}
