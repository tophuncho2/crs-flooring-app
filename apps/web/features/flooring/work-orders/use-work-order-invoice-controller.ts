"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  useRecordSectionWorkflow,
  type RecordSectionWorkflowPhase,
} from "@/features/dashboard/shared/record-view/client/use-record-section-workflow"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import type { WorkOrderInvoiceStatusResponse } from "./transport/invoice"

type InvoiceStatusView = WorkOrderInvoiceStatusResponse

const EMPTY_INVOICE_STATE: InvoiceStatusView = {
  sourceVersion: "",
  generation: null,
  artifact: null,
  canOpen: false,
}

function buildInvoiceSyncKey(invoice: InvoiceStatusView | null | undefined) {
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

function readInvoiceWorkflowStatus(invoice: InvoiceStatusView | null | undefined) {
  return invoice?.generation?.status ?? (invoice?.canOpen ? "COMPLETED" : null)
}

export function useWorkOrderInvoiceController(
  workOrderId: string,
  options?: {
    enabled?: boolean
    initialInvoice?: WorkOrderInvoiceStatusResponse | null
    refreshToken?: string
  },
) {
  const enabled = options?.enabled ?? false
  const initialInvoice = useMemo(
    () => options?.initialInvoice ?? EMPTY_INVOICE_STATE,
    [options?.initialInvoice],
  )
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const refreshInvoiceState = useCallback(async () => {
    setIsLoading(true)
    try {
      const payload = await requestJson<WorkOrderInvoiceStatusResponse>(`/api/flooring/work-orders/${workOrderId}/invoice`, {
        cache: "no-store",
      })
      setHasLoadedOnce(true)
      return payload
    } finally {
      setIsLoading(false)
    }
  }, [workOrderId])

  const workflow = useRecordSectionWorkflow<InvoiceStatusView | null>({
    value: initialInvoice,
    getSyncKey: buildInvoiceSyncKey,
    readStatus: readInvoiceWorkflowStatus,
    refresh: refreshInvoiceState,
    getTerminalKey: (invoice) =>
      invoice?.generation ? `${invoice.generation.id}:${invoice.generation.status}` : invoice?.artifact?.id ?? null,
  })
  const { refresh, setValue, setError, value, error, phase, isPending } = workflow

  useEffect(() => {
    if (!enabled && !hasLoadedOnce) {
      return
    }

    void refresh()
  }, [enabled, hasLoadedOnce, options?.refreshToken, refresh])

  const queueInvoice = useCallback(async (expectedUpdatedAt: string) => {
    const payload = await requestJson<WorkOrderInvoiceStatusResponse>(`/api/flooring/work-orders/${workOrderId}/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({}, expectedUpdatedAt)),
    })

    setValue(payload)
    setError(null)
    return payload
  }, [setError, setValue, workOrderId])

  const openInvoice = useCallback(() => {
    if (!value?.artifact?.downloadUrl) {
      return
    }

    window.open(value.artifact.downloadUrl, "_blank", "noopener")
  }, [value?.artifact?.downloadUrl])

  return {
    invoice: value ?? EMPTY_INVOICE_STATE,
    error,
    phase: phase as RecordSectionWorkflowPhase,
    hasLoadedOnce,
    isLoading,
    isGenerating: isPending,
    queueInvoice,
    openInvoice,
    refreshInvoice: refresh,
  }
}
