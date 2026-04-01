"use client"

import { useCallback } from "react"
import {
  createRecordSectionError,
  useRecordSectionWorkflow,
} from "@/modules/shared/engines/record-view"
import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import type { WorkOrderAutoAllocationStatusResponse } from "@/modules/work-orders/transport/allocations"
import type { WorkOrderAutoAllocationRun, WorkOrderDetail } from "@/modules/work-orders/types"

const STALLED_PENDING_THRESHOLD_MS = 2 * 60 * 1000

function buildAutoAllocationSyncKey(value: WorkOrderAutoAllocationRun | null) {
  return value ? `${value.id}:${value.status}:${value.sourceVersion}` : "none"
}

function readAutoAllocationStatus(value: WorkOrderAutoAllocationRun | null) {
  return value?.status
}

function buildAutoAllocationTerminalKey(value: WorkOrderAutoAllocationRun | null) {
  return value ? `${value.id}:${value.status}` : null
}

function readPendingReferenceTimestamp(value: WorkOrderAutoAllocationRun | null) {
  return value?.startedAt ?? value?.queuedAt ?? value?.requestedAt ?? null
}

function readPendingDurationMs(value: WorkOrderAutoAllocationRun | null) {
  const referenceTimestamp = readPendingReferenceTimestamp(value)
  if (!referenceTimestamp) {
    return null
  }

  const startedAtMs = new Date(referenceTimestamp).getTime()
  if (Number.isNaN(startedAtMs)) {
    return null
  }

  return Math.max(Date.now() - startedAtMs, 0)
}

function readPollingIntervalMs(value: WorkOrderAutoAllocationRun | null) {
  const pendingDurationMs = readPendingDurationMs(value)
  if (pendingDurationMs === null) {
    return 3000
  }

  if (pendingDurationMs >= STALLED_PENDING_THRESHOLD_MS) {
    return 15000
  }

  if (pendingDurationMs >= 30_000) {
    return 5000
  }

  return 3000
}

function isAutoAllocationWorkflowStalled(value: WorkOrderAutoAllocationRun | null) {
  const pendingDurationMs = readPendingDurationMs(value)
  return pendingDurationMs !== null && pendingDurationMs >= STALLED_PENDING_THRESHOLD_MS
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
      `/api/work-orders/${workOrder.id}/auto-allocation`,
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
    getPollingIntervalMs: readPollingIntervalMs,
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
        `/api/work-orders/${workOrder.id}/auto-allocation`,
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
      setError(
        createRecordSectionError({
          kind: "workflow",
          message,
        }),
      )
      showError(message)
      return null
    }
  }, [applyConflictWorkOrderSnapshot, clearNotices, setError, setValue, showError, showSuccess, workOrder.id, workOrder.updatedAt])

  return {
    ...workflow,
    isStalled: isAutoAllocationWorkflowStalled(workflow.value),
    requestAutoAllocation,
  }
}
