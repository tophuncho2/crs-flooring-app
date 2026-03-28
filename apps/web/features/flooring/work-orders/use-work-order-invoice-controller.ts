"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePendingWorkflowPolling } from "@/features/dashboard/shared/record-view/client/use-pending-workflow-polling"
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
  const [invoice, setInvoice] = useState<InvoiceStatusView>(initialInvoice)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setInvoice((current) => {
      if (!options?.initialInvoice) {
        return current
      }

      const currentKey = [
        current.sourceVersion,
        current.generation?.id ?? "",
        current.generation?.status ?? "",
        current.artifact?.id ?? "",
      ].join(":")
      const nextKey = [
        options.initialInvoice.sourceVersion,
        options.initialInvoice.generation?.id ?? "",
        options.initialInvoice.generation?.status ?? "",
        options.initialInvoice.artifact?.id ?? "",
      ].join(":")

      return currentKey === nextKey ? current : options.initialInvoice
    })
  }, [options?.initialInvoice])

  const refreshInvoice = useCallback(
    async (options?: { suppressErrors?: boolean }) => {
      setIsLoading(true)
      try {
        const payload = await requestJson<WorkOrderInvoiceStatusResponse>(`/api/flooring/work-orders/${workOrderId}/invoice`, {
          cache: "no-store",
        })

        setInvoice(payload)
        setHasLoadedOnce(true)
        setError(null)
        return payload
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load invoice status"
        setError(message)
        if (!options?.suppressErrors) {
          throw new Error(message)
        }
      } finally {
        setIsLoading(false)
      }

      return null
    },
    [workOrderId],
  )

  useEffect(() => {
    if (!enabled && !hasLoadedOnce) {
      return
    }

    void refreshInvoice({ suppressErrors: true })
  }, [enabled, hasLoadedOnce, refreshInvoice, options?.refreshToken])

  usePendingWorkflowPolling({
    isPending:
      invoice.generation?.status === "REQUESTED" ||
      invoice.generation?.status === "QUEUED" ||
      invoice.generation?.status === "PROCESSING",
    refresh: () => refreshInvoice({ suppressErrors: true }),
  })

  const queueInvoice = useCallback(async (expectedUpdatedAt: string) => {
    const payload = await requestJson<WorkOrderInvoiceStatusResponse>(`/api/flooring/work-orders/${workOrderId}/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({}, expectedUpdatedAt)),
    })

    setInvoice(payload)
    setError(null)
    return payload
  }, [workOrderId])

  const openInvoice = useCallback(() => {
    if (!invoice.artifact?.downloadUrl) {
      return
    }

    window.open(invoice.artifact.downloadUrl, "_blank", "noopener")
  }, [invoice.artifact?.downloadUrl])

  return {
    invoice,
    error,
    hasLoadedOnce,
    isLoading,
    isGenerating:
      invoice.generation?.status === "REQUESTED" ||
      invoice.generation?.status === "QUEUED" ||
      invoice.generation?.status === "PROCESSING",
    queueInvoice,
    openInvoice,
    refreshInvoice,
  }
}
