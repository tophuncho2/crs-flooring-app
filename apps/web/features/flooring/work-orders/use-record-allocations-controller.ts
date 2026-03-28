"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePendingWorkflowPolling } from "@/features/dashboard/shared/record-view/client/use-pending-workflow-polling"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
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
  WorkOrderDetail,
  WorkOrderAutoAllocationRun,
  WorkOrderItemAllocationRow,
  WorkOrderMaterialItem,
} from "./types"
import type { WorkOrderAutoAllocationStatusResponse } from "./transport/allocations"

const defaultAllocationDraft: AllocationDraft = {
  inventoryId: "",
  quantity: "",
  notes: "",
}

export function useRecordAllocationsController({
  workOrderId,
  workOrderUpdatedAt,
  materialItems,
  setMaterialItems,
  notices,
  onAutoAllocationCompleted,
  onMaterialItemsChanged,
  onWorkOrderChange,
}: {
  workOrderId: string
  workOrderUpdatedAt: string
  materialItems: WorkOrderMaterialItem[]
  setMaterialItems: (value: WorkOrderMaterialItem[] | ((previous: WorkOrderMaterialItem[]) => WorkOrderMaterialItem[])) => void
  notices: Pick<RecordNotices, "clearNotices" | "showSuccess" | "showError">
  onAutoAllocationCompleted?: () => void | Promise<void>
  onMaterialItemsChanged?: (nextItems: WorkOrderMaterialItem[]) => void
  onWorkOrderChange?: (nextWorkOrder: WorkOrderDetail) => void
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
  const workOrderUpdatedAtRef = useRef(workOrderUpdatedAt)
  const onAutoAllocationCompletedRef = useRef(onAutoAllocationCompleted)
  const onMaterialItemsChangedRef = useRef(onMaterialItemsChanged)
  const onWorkOrderChangeRef = useRef(onWorkOrderChange)

  useEffect(() => {
    materialItemsRef.current = materialItems
  }, [materialItems])

  useEffect(() => {
    workOrderUpdatedAtRef.current = workOrderUpdatedAt
  }, [workOrderUpdatedAt])

  useEffect(() => {
    onAutoAllocationCompletedRef.current = onAutoAllocationCompleted
  }, [onAutoAllocationCompleted])

  useEffect(() => {
    onMaterialItemsChangedRef.current = onMaterialItemsChanged
  }, [onMaterialItemsChanged])

  useEffect(() => {
    onWorkOrderChangeRef.current = onWorkOrderChange
  }, [onWorkOrderChange])

  const isAutoAllocating = useMemo(
    () =>
      autoAllocationRun?.status === "REQUESTED" ||
      autoAllocationRun?.status === "QUEUED" ||
      autoAllocationRun?.status === "PROCESSING",
    [autoAllocationRun?.status],
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

  usePendingWorkflowPolling({
    isPending: isAutoAllocating,
    refresh: () => refreshAutoAllocationRun({ suppressErrors: true }),
    getTerminalKey: (payload) => (payload.run ? `${payload.run.id}:${payload.run.status}` : null),
    onTerminal: async (payload) => {
      if (!payload.run) {
        return
      }

      if (payload.run.status === "COMPLETED") {
        await onAutoAllocationCompletedRef.current?.()
        notices.showSuccess("Auto allocation completed")
      }

      if (payload.run.status === "FAILED") {
        notices.showError(payload.run.failureMessage || "Auto allocation failed")
      }
    },
  })

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
      setMaterialItems((previous) => {
        const nextItems = previous.map((item) =>
          item.id === itemId
            ? {
                ...item,
                allocations: item.allocations.map((allocation) =>
                  allocation.id === allocationId ? { ...allocation, [field]: value } : allocation,
                ),
              }
            : item,
        )
        onMaterialItemsChangedRef.current?.(nextItems)
        return nextItems
      })

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
      const payload = await requestJson<{ allocation: WorkOrderItemAllocationRow; workOrder?: WorkOrderDetail }>(
        `/api/flooring/work-orders/${workOrderId}/items/${itemId}/allocations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withMutationMeta(draft)),
        },
      )

      if (payload.workOrder) {
        onWorkOrderChangeRef.current?.(payload.workOrder)
      } else {
        throw new Error("Allocation create response did not include the updated work order snapshot")
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

  async function saveAllocation(
    itemId: string,
    allocation: WorkOrderItemAllocationRow,
    options?: { suppressClear?: boolean; suppressSuccess?: boolean },
  ) {
    if (!options?.suppressClear) {
      notices.clearNotices()
    }
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
      return false
    }

    setSavingAllocationId(allocation.id)

    try {
      const payload = await requestJson<{ allocation: WorkOrderItemAllocationRow; workOrder?: WorkOrderDetail }>(
        `/api/flooring/work-orders/${workOrderId}/items/${itemId}/allocations/${allocation.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            withMutationMeta(
              {
                inventoryId: allocation.inventoryId,
                quantity: allocation.quantity,
                cutSize: allocation.cutSize,
                notes: allocation.notes,
              },
              allocation.updatedAt,
            ),
          ),
        },
      )

      if (payload.workOrder) {
        onWorkOrderChangeRef.current?.(payload.workOrder)
      } else {
        throw new Error("Allocation save response did not include the updated work order snapshot")
      }
      void loadAllocationOptions(itemId)
      setItemErrorsByItemId((previous) => ({
        ...previous,
        [itemId]: setRowFieldErrors(previous[itemId] ?? {}, allocation.id, {}),
      }))
      if (!options?.suppressSuccess) {
        notices.showSuccess("Allocation saved")
      }
      return true
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
      return false
    } finally {
      setSavingAllocationId(null)
    }
  }

  async function saveAllocationsForItem(
    itemId: string,
    options?: { suppressClear?: boolean; suppressSuccess?: boolean },
  ) {
    const currentItem = materialItemsRef.current.find((item) => item.id === itemId)
    if (!currentItem) {
      return false
    }

    if (!options?.suppressClear) {
      notices.clearNotices()
    }

    for (const allocation of currentItem.allocations) {
      const didSave = await saveAllocation(itemId, allocation, {
        suppressClear: true,
        suppressSuccess: true,
      })

      if (!didSave) {
        return false
      }
    }

    if (!options?.suppressSuccess) {
      notices.showSuccess("Allocations saved")
    }

    return true
  }

  async function deleteAllocation(itemId: string, allocationId: string) {
    notices.clearNotices()
    setDeletingAllocationId(allocationId)

    try {
      const currentItem = materialItemsRef.current.find((item) => item.id === itemId)
      const currentAllocation = currentItem?.allocations.find((allocation) => allocation.id === allocationId)
      const payload = await requestJson<{ ok: boolean; workOrder?: WorkOrderDetail }>(
        `/api/flooring/work-orders/${workOrderId}/items/${itemId}/allocations/${allocationId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withMutationMeta({}, currentAllocation?.updatedAt)),
        },
      )
      if (payload.workOrder) {
        onWorkOrderChangeRef.current?.(payload.workOrder)
      } else if (currentItem) {
        throw new Error("Allocation delete response did not include the updated work order snapshot")
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
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta({}, workOrderUpdatedAtRef.current)),
      },
    )
    setAutoAllocationRun(payload.run)
    return payload
  }

  function clearAllocationErrors(itemId: string) {
    setDraftErrorsByItemId((previous) => ({ ...previous, [itemId]: {} }))
    setItemErrorsByItemId((previous) => ({ ...previous, [itemId]: {} }))
  }

  function clearAllocationDraft(itemId: string) {
    setDraftsByItemId((previous) => ({ ...previous, [itemId]: defaultAllocationDraft }))
  }

  return {
    expandedItemIds,
    draftsByItemId,
    setDraftsByItemId,
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
    saveAllocationsForItem,
    deleteAllocation,
    requestAutoAllocation,
    clearAllocationErrors,
    clearAllocationDraft,
  }
}
