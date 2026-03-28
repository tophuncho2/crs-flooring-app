"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { buildWorkOrderItemAllocationSummary } from "@builders/domain"
import { requestJson } from "@/features/flooring/shared/transport/http"
import {
  clearFieldError,
  clearRowFieldError,
  getRequestFieldError,
  setFieldError,
  setRowFieldErrors,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import type { RecordNotices } from "@/features/dashboard/shared/record-view/client/use-record-notices"
import {
  validateAllocationFields,
  type AllocationDraft,
  type AllocationField,
  type AllocationFieldErrors,
} from "./components/material-allocations-editor"
import type {
  InventoryAllocationOption,
  WorkOrderAutoAllocationRun,
  WorkOrderItemAllocationRow,
  WorkOrderMaterialItem,
} from "./types"
import type { WorkOrderAutoAllocationStatusResponse } from "./transport/allocations"

const defaultAllocationDraft: AllocationDraft = {
  inventoryId: "",
  quantity: "",
  cutSize: "",
  notes: "",
}

function hydrateMaterialItem(item: WorkOrderMaterialItem): WorkOrderMaterialItem {
  const allocationSummary = buildWorkOrderItemAllocationSummary({
    requiredQuantity: item.quantity,
    allocations: item.allocations.map((allocation) => ({
      quantity: allocation.quantity,
      unitCost: allocation.unitCost,
    })),
  })

  return {
    ...item,
    allocatedQuantity: allocationSummary.allocatedQuantity,
    remainingQuantity: allocationSummary.remainingQuantity,
    materialExpense: allocationSummary.materialExpense,
    hasAllocationShortage: allocationSummary.hasAllocationShortage,
    changeOrderStatus: allocationSummary.hasAllocationShortage ? "SHORTAGE" : "SUFFICIENT",
  }
}

export function useRecordAllocationsController({
  workOrderId,
  materialItems,
  setMaterialItems,
  notices,
  onAutoAllocationCompleted,
  onMaterialItemsChanged,
}: {
  workOrderId: string
  materialItems: WorkOrderMaterialItem[]
  setMaterialItems: (value: WorkOrderMaterialItem[] | ((previous: WorkOrderMaterialItem[]) => WorkOrderMaterialItem[])) => void
  notices: Pick<RecordNotices, "clearNotices" | "showSuccess" | "showError">
  onAutoAllocationCompleted?: () => void | Promise<void>
  onMaterialItemsChanged?: (nextItems: WorkOrderMaterialItem[]) => void
}) {
  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([])
  const [draftsByItemId, setDraftsByItemId] = useState<Record<string, AllocationDraft>>({})
  const [draftErrorsByItemId, setDraftErrorsByItemId] = useState<Record<string, AllocationFieldErrors>>({})
  const [itemErrorsByItemId, setItemErrorsByItemId] = useState<Record<string, RowFieldErrors<AllocationField>>>({})
  const [optionsByItemId, setOptionsByItemId] = useState<Record<string, InventoryAllocationOption[]>>({})
  const [loadingOptionsByItemId, setLoadingOptionsByItemId] = useState<Record<string, boolean>>({})
  const [addingItemId, setAddingItemId] = useState<string | null>(null)
  const [savingAllocationId, setSavingAllocationId] = useState<string | null>(null)
  const [deletingAllocationId, setDeletingAllocationId] = useState<string | null>(null)
  const [autoAllocationRun, setAutoAllocationRun] = useState<WorkOrderAutoAllocationRun | null>(null)
  const materialItemsRef = useRef(materialItems)
  const onAutoAllocationCompletedRef = useRef(onAutoAllocationCompleted)
  const onMaterialItemsChangedRef = useRef(onMaterialItemsChanged)

  useEffect(() => {
    materialItemsRef.current = materialItems
  }, [materialItems])

  useEffect(() => {
    onAutoAllocationCompletedRef.current = onAutoAllocationCompleted
  }, [onAutoAllocationCompleted])

  useEffect(() => {
    onMaterialItemsChangedRef.current = onMaterialItemsChanged
  }, [onMaterialItemsChanged])

  const isAutoAllocating = useMemo(
    () =>
      autoAllocationRun?.status === "REQUESTED" ||
      autoAllocationRun?.status === "QUEUED" ||
      autoAllocationRun?.status === "PROCESSING",
    [autoAllocationRun?.status],
  )

  const syncItemAllocationState = useCallback(
    (itemId: string, allocations: WorkOrderItemAllocationRow[]) => {
      setMaterialItems((previous) => {
        const nextItems = previous.map((item) =>
          item.id === itemId
            ? hydrateMaterialItem({
                ...item,
                allocations,
              })
            : item,
        )

        onMaterialItemsChangedRef.current?.(nextItems)
        return nextItems
      })
    },
    [setMaterialItems],
  )

  const loadAllocationOptions = useCallback(async (itemId: string) => {
    setLoadingOptionsByItemId((previous) => ({ ...previous, [itemId]: true }))
    try {
      const payload = await requestJson<{ options: InventoryAllocationOption[] }>(
        `/api/flooring/work-orders/${workOrderId}/items/${itemId}/allocation-options`,
        { cache: "no-store" },
      )
      setOptionsByItemId((previous) => ({ ...previous, [itemId]: payload.options }))
      return payload.options
    } finally {
      setLoadingOptionsByItemId((previous) => ({ ...previous, [itemId]: false }))
    }
  }, [workOrderId])

  const refreshAutoAllocationRun = useCallback(async (options?: { suppressErrors?: boolean }) => {
    try {
      const payload = await requestJson<WorkOrderAutoAllocationStatusResponse>(
        `/api/flooring/work-orders/${workOrderId}/auto-allocation`,
        { cache: "no-store" },
      )
      setAutoAllocationRun(payload.run)
      return payload
    } catch (error) {
      if (!options?.suppressErrors) {
        throw error
      }
    }

    return null
  }, [workOrderId])

  useEffect(() => {
    void refreshAutoAllocationRun({ suppressErrors: true })
  }, [refreshAutoAllocationRun])

  useEffect(() => {
    if (!isAutoAllocating) {
      return undefined
    }

    const interval = window.setInterval(() => {
      void refreshAutoAllocationRun({ suppressErrors: true }).then(async (payload) => {
        if (!payload?.run) {
          return
        }

        if (payload.run.status === "COMPLETED") {
          await onAutoAllocationCompletedRef.current?.()
          notices.showSuccess("Auto allocation completed")
        }

        if (payload.run.status === "FAILED") {
          notices.showError(payload.run.failureMessage || "Auto allocation failed")
        }
      })
    }, 3000)

    return () => {
      window.clearInterval(interval)
    }
  }, [isAutoAllocating, notices, refreshAutoAllocationRun])

  const toggleExpandedItem = useCallback(
    (itemId: string) => {
      setExpandedItemIds((previous) => {
        const isExpanded = previous.includes(itemId)
        if (isExpanded) {
          return previous.filter((current) => current !== itemId)
        }

        void loadAllocationOptions(itemId)

        return [...previous, itemId]
      })
    },
    [loadAllocationOptions],
  )

  const handleDraftChange = useCallback((itemId: string, field: keyof AllocationDraft, value: string) => {
    setDraftsByItemId((previous) => ({
      ...previous,
      [itemId]: {
        ...(previous[itemId] ?? defaultAllocationDraft),
        [field]: value,
      },
    }))

    if (field === "inventoryId" || field === "quantity") {
      setDraftErrorsByItemId((previous) => ({
        ...previous,
        [itemId]: clearFieldError(previous[itemId] ?? {}, field),
      }))
    }
  }, [])

  const handleAllocationFieldChange = useCallback(
    (itemId: string, allocationId: string, field: keyof AllocationDraft, value: string) => {
      setMaterialItems((previous) =>
        previous.map((item) =>
          item.id === itemId
            ? {
                ...item,
                allocations: item.allocations.map((allocation) =>
                  allocation.id === allocationId ? { ...allocation, [field]: value } : allocation,
                ),
              }
            : item,
        ),
      )

      if (field === "inventoryId" || field === "quantity") {
        setItemErrorsByItemId((previous) => ({
          ...previous,
          [itemId]: clearRowFieldError(previous[itemId] ?? {}, allocationId, field),
        }))
      }
    },
    [setMaterialItems],
  )

  async function addAllocation(itemId: string) {
    notices.clearNotices()
    const draft = draftsByItemId[itemId] ?? defaultAllocationDraft
    const validationErrors = validateAllocationFields(draft)

    if (Object.keys(validationErrors).length > 0) {
      setDraftErrorsByItemId((previous) => ({
        ...previous,
        [itemId]: validationErrors,
      }))
      notices.showError("Fix the highlighted allocation fields before adding.")
      return false
    }

    setAddingItemId(itemId)

    try {
      const payload = await requestJson<{ allocation: WorkOrderItemAllocationRow }>(
        `/api/flooring/work-orders/${workOrderId}/items/${itemId}/allocations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      )

      const currentItem = materialItemsRef.current.find((item) => item.id === itemId)
      if (currentItem) {
        syncItemAllocationState(itemId, [...currentItem.allocations, payload.allocation])
      }
      void loadAllocationOptions(itemId)
      setDraftsByItemId((previous) => ({ ...previous, [itemId]: defaultAllocationDraft }))
      setDraftErrorsByItemId((previous) => ({ ...previous, [itemId]: {} }))
      notices.showSuccess("Allocation added")
      return true
    } catch (error) {
      const fieldError = getRequestFieldError(error)
      if (fieldError.field === "inventoryId" || fieldError.field === "quantity") {
        const field = fieldError.field
        setDraftErrorsByItemId((previous) => ({
          ...previous,
          [itemId]: setFieldError(field, fieldError.message),
        }))
      }
      notices.showError(fieldError.message || "Failed to add allocation")
      return false
    } finally {
      setAddingItemId(null)
    }
  }

  async function saveAllocation(itemId: string, allocation: WorkOrderItemAllocationRow) {
    notices.clearNotices()
    const validationErrors = validateAllocationFields({
      inventoryId: allocation.inventoryId,
      quantity: allocation.quantity,
    })

    if (Object.keys(validationErrors).length > 0) {
      setItemErrorsByItemId((previous) => ({
        ...previous,
        [itemId]: setRowFieldErrors(previous[itemId] ?? {}, allocation.id, validationErrors),
      }))
      notices.showError("Fix the highlighted allocation fields before saving.")
      return
    }

    setSavingAllocationId(allocation.id)

    try {
      const payload = await requestJson<{ allocation: WorkOrderItemAllocationRow }>(
        `/api/flooring/work-orders/${workOrderId}/items/${itemId}/allocations/${allocation.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventoryId: allocation.inventoryId,
            quantity: allocation.quantity,
            cutSize: allocation.cutSize,
            notes: allocation.notes,
          }),
        },
      )

      const currentItem = materialItemsRef.current.find((item) => item.id === itemId)
      if (currentItem) {
        syncItemAllocationState(
          itemId,
          currentItem.allocations.map((currentAllocation) =>
            currentAllocation.id === allocation.id ? payload.allocation : currentAllocation,
          ),
        )
      }
      void loadAllocationOptions(itemId)
      setItemErrorsByItemId((previous) => ({
        ...previous,
        [itemId]: setRowFieldErrors(previous[itemId] ?? {}, allocation.id, {}),
      }))
      notices.showSuccess("Allocation saved")
    } catch (error) {
      const fieldError = getRequestFieldError(error)
      if (fieldError.field === "inventoryId" || fieldError.field === "quantity") {
        const field = fieldError.field
        setItemErrorsByItemId((previous) => ({
          ...previous,
          [itemId]: setRowFieldErrors(
            previous[itemId] ?? {},
            allocation.id,
            setFieldError(field, fieldError.message),
          ),
        }))
      }
      notices.showError(fieldError.message || "Failed to save allocation")
    } finally {
      setSavingAllocationId(null)
    }
  }

  async function deleteAllocation(itemId: string, allocationId: string) {
    notices.clearNotices()
    setDeletingAllocationId(allocationId)

    try {
      await requestJson(
        `/api/flooring/work-orders/${workOrderId}/items/${itemId}/allocations/${allocationId}`,
        { method: "DELETE" },
      )
      const currentItem = materialItemsRef.current.find((item) => item.id === itemId)
      if (currentItem) {
        syncItemAllocationState(
          itemId,
          currentItem.allocations.filter((allocation) => allocation.id !== allocationId),
        )
      }
      void loadAllocationOptions(itemId)
      notices.showSuccess("Allocation deleted")
    } catch (error) {
      const fieldError = getRequestFieldError(error)
      notices.showError(fieldError.message || "Failed to delete allocation")
    } finally {
      setDeletingAllocationId(null)
    }
  }

  async function requestAutoAllocation() {
    notices.clearNotices()
    const payload = await requestJson<WorkOrderAutoAllocationStatusResponse>(
      `/api/flooring/work-orders/${workOrderId}/auto-allocation`,
      { method: "POST" },
    )
    setAutoAllocationRun(payload.run)
    return payload
  }

  return {
    expandedItemIds,
    draftsByItemId,
    draftErrorsByItemId,
    itemErrorsByItemId,
    optionsByItemId,
    loadingOptionsByItemId,
    addingItemId,
    savingAllocationId,
    deletingAllocationId,
    autoAllocationRun,
    isAutoAllocating,
    toggleExpandedItem,
    loadAllocationOptions,
    handleDraftChange,
    handleAllocationFieldChange,
    addAllocation,
    saveAllocation,
    deleteAllocation,
    requestAutoAllocation,
  }
}
