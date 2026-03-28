"use client"

import { useCallback } from "react"
import { useRecordSectionWorkflow } from "@/features/dashboard/shared/record-view/client/use-record-section-workflow"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import type { WorkOrderAutoAllocationStatusResponse } from "@/features/flooring/work-orders/transport/allocations"
import type { WorkOrderAutoAllocationRun, WorkOrderDetail } from "@/features/flooring/work-orders/types"

function buildAutoAllocationSyncKey(value: WorkOrderAutoAllocationRun | null) {
  return value ? `${value.id}:${value.status}:${value.sourceVersion}` : "none"
}

function readAutoAllocationStatus(value: WorkOrderAutoAllocationRun | null) {
  return value?.status
}

function buildAutoAllocationTerminalKey(value: WorkOrderAutoAllocationRun | null) {
  return value ? `${value.id}:${value.status}` : null
}

export function useWorkOrderAutoAllocationWorkflow(input: {
  workOrder: WorkOrderDetail
  refreshWorkOrderDetail: () => Promise<WorkOrderDetail>
  clearNotices: () => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
  applyConflictWorkOrderSnapshot: (error: unknown) => WorkOrderDetail | null
}) {
  const { workOrder, refreshWorkOrderDetail, clearNotices, showSuccess, showError, applyConflictWorkOrderSnapshot } = input

  const refreshRun = useCallback(async () => {
    const payload = await requestJson<WorkOrderAutoAllocationStatusResponse>(
      `/api/flooring/work-orders/${workOrder.id}/auto-allocation`,
      { cache: "no-store" },
    )
    return payload.run
  }, [workOrder.id])

  const workflow = useRecordSectionWorkflow<WorkOrderAutoAllocationRun | null>({
    value: workOrder.autoAllocationRun ?? null,
    getSyncKey: buildAutoAllocationSyncKey,
    readStatus: readAutoAllocationStatus,
    refresh: refreshRun,
    getTerminalKey: buildAutoAllocationTerminalKey,
    onTerminal: async (value) => {
      if (!value) {
        return
      }

      if (value.status === "COMPLETED") {
        await refreshWorkOrderDetail()
        showSuccess("Auto allocation completed")
        return
      }

      if (value.status === "FAILED") {
        showError(value.failureMessage || "Auto allocation failed")
        return
      }

      if (value.status === "SUPERSEDED") {
        showError("Auto allocation was superseded by a newer work order version")
      }
    },
  })
  const { setError, setValue } = workflow

  const requestAutoAllocation = useCallback(async () => {
    clearNotices()

    try {
      const payload = await requestJson<WorkOrderAutoAllocationStatusResponse>(
        `/api/flooring/work-orders/${workOrder.id}/auto-allocation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withMutationMeta({}, workOrder.updatedAt)),
        },
      )
      setValue(payload.run)
      showSuccess("Auto allocation requested")
      return payload.run
    } catch (allocationError) {
      applyConflictWorkOrderSnapshot(allocationError)
      const message = allocationError instanceof Error ? allocationError.message : "Failed to request auto allocation"
      setError(message)
      showError(message)
      return null
    }
  }, [applyConflictWorkOrderSnapshot, clearNotices, setError, setValue, showError, showSuccess, workOrder.id, workOrder.updatedAt])

  return {
    ...workflow,
    requestAutoAllocation,
  }
}
