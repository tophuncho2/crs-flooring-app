"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  useRecordSectionWorkflow,
  type RecordSectionWorkflowPhase,
} from "@/features/shared/engines/record-view"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import type { WorkOrderInvoiceStatusResponse } from "@/features/flooring/work-orders/transport/invoice"
import type { WorkOrderDetail } from "@/features/flooring/work-orders/types"

const EMPTY_INVOICE_STATE: WorkOrderInvoiceStatusResponse = {
  sourceVersion: "",
  generation: null,
  artifact: null,
  canOpen: false,
}

const STALLED_PENDING_THRESHOLD_MS = 2 * 60 * 1000

function buildInvoiceSyncKey(invoice: WorkOrderInvoiceStatusResponse | null | undefined) {
  if (!invoice) {
    return "invoice:empty"
  }

  return [
    invoice.sourceVersion,
    invoice.generation?.id ?? "",
    invoice.generation?.status ?? "",
    invoice.artifact?.id ?? "",
    invoice.artifact?.createdAt ?? "",
    invoice.canOpen ? "open" : "closed",
  ].join(":")
}

function readInvoiceWorkflowStatus(invoice: WorkOrderInvoiceStatusResponse | null | undefined) {
  return invoice?.generation?.status ?? (invoice?.canOpen ? "COMPLETED" : null)
}

function buildInvoiceTerminalKey(invoice: WorkOrderInvoiceStatusResponse | null | undefined) {
  return invoice?.generation ? `${invoice.generation.id}:${invoice.generation.status}` : invoice?.artifact?.id ?? null
}

function readPendingReferenceTimestamp(invoice: WorkOrderInvoiceStatusResponse | null | undefined) {
  return invoice?.generation?.startedAt ?? invoice?.generation?.queuedAt ?? invoice?.generation?.requestedAt ?? null
}

function readPendingDurationMs(invoice: WorkOrderInvoiceStatusResponse | null | undefined) {
  const referenceTimestamp = readPendingReferenceTimestamp(invoice)
  if (!referenceTimestamp) {
    return null
  }

  const startedAtMs = new Date(referenceTimestamp).getTime()
  if (Number.isNaN(startedAtMs)) {
    return null
  }

  return Math.max(Date.now() - startedAtMs, 0)
}

function readPollingIntervalMs(invoice: WorkOrderInvoiceStatusResponse | null | undefined) {
  const pendingDurationMs = readPendingDurationMs(invoice)
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

function isInvoiceWorkflowStalled(invoice: WorkOrderInvoiceStatusResponse | null | undefined) {
  const pendingDurationMs = readPendingDurationMs(invoice)
  return pendingDurationMs !== null && pendingDurationMs >= STALLED_PENDING_THRESHOLD_MS
}

export function useWorkOrderInvoiceWorkflow(input: {
  workOrder: WorkOrderDetail
  enabled: boolean
  clearNotices: () => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
  applyConflictWorkOrderSnapshot: (error: unknown) => WorkOrderDetail | null
}) {
  const { workOrder, enabled, clearNotices, showSuccess, showError, applyConflictWorkOrderSnapshot } = input
  const initialInvoice = useMemo(
    () => workOrder.invoiceStatus ?? EMPTY_INVOICE_STATE,
    [workOrder.invoiceStatus],
  )
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const refreshInvoiceState = useCallback(async () => {
    setIsLoading(true)
    try {
      const payload = await requestJson<WorkOrderInvoiceStatusResponse>(`/api/flooring/work-orders/${workOrder.id}/invoice`, {
        cache: "no-store",
      })
      setHasLoadedOnce(true)
      return payload
    } finally {
      setIsLoading(false)
    }
  }, [workOrder.id])

  const workflow = useRecordSectionWorkflow<WorkOrderInvoiceStatusResponse | null>({
    value: initialInvoice,
    getSyncKey: buildInvoiceSyncKey,
    readStatus: readInvoiceWorkflowStatus,
    refresh: refreshInvoiceState,
    getTerminalKey: buildInvoiceTerminalKey,
    getPollingIntervalMs: readPollingIntervalMs,
    onTerminal: async (invoice) => {
      if (!invoice?.generation) {
        return
      }

      if (invoice.generation.status === "COMPLETED") {
        showSuccess("Invoice ready")
        return
      }

      if (invoice.generation.status === "FAILED") {
        showError(invoice.generation.error || "Invoice generation failed")
        return
      }

      if (invoice.generation.status === "SUPERSEDED") {
        showError("Invoice generation was superseded by a newer work order version")
      }
    },
  })
  const { refresh, setValue, setError, value, error, phase, isPending } = workflow

  useEffect(() => {
    if (!enabled && !hasLoadedOnce) {
      return
    }

    void refresh()
  }, [enabled, hasLoadedOnce, refresh, workOrder.updatedAt])

  const queueInvoice = useCallback(async () => {
    clearNotices()

    try {
      const payload = await requestJson<WorkOrderInvoiceStatusResponse>(`/api/flooring/work-orders/${workOrder.id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta({}, workOrder.updatedAt)),
      })

      setValue(payload)
      setError(null)

      if (payload.generation?.status === "COMPLETED") {
        showSuccess("Invoice already available")
        return payload
      }

      if (payload.generation?.status === "FAILED") {
        showError(payload.generation.error || "Invoice generation failed")
        return payload
      }

      showSuccess("Invoice generation requested")
      return payload
    } catch (invoiceError) {
      applyConflictWorkOrderSnapshot(invoiceError)
      const message = invoiceError instanceof Error ? invoiceError.message : "Failed to request invoice generation"
      setError(message)
      showError(message)
      return null
    }
  }, [applyConflictWorkOrderSnapshot, clearNotices, setError, setValue, showError, showSuccess, workOrder.id, workOrder.updatedAt])

  const openInvoice = useCallback(() => {
    if (!value?.artifact?.downloadUrl) {
      return
    }

    window.open(value.artifact.downloadUrl, "_blank", "noopener")
  }, [value?.artifact?.downloadUrl])

  return {
    ...workflow,
    invoice: value ?? EMPTY_INVOICE_STATE,
    error,
    phase: phase as RecordSectionWorkflowPhase,
    hasLoadedOnce,
    isLoading,
    isGenerating: isPending,
    isStalled: isInvoiceWorkflowStalled(value),
    queueInvoice,
    openInvoice,
    refreshInvoice: refresh,
  }
}
