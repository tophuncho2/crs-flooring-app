"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
  refreshToken: string,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? false
  const initialInvoice = useMemo(() => EMPTY_INVOICE_STATE, [])
  const [invoice, setInvoice] = useState<InvoiceStatusView>(initialInvoice)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const refreshInvoice = useCallback(
    async (options?: { suppressErrors?: boolean }) => {
      setIsLoading(true)
      try {
        const payload = await requestJson<WorkOrderInvoiceStatusResponse>(`/api/flooring/work-orders/${workOrderId}/invoice`, {
          cache: "no-store",
        })

        setInvoice(payload)
        setHasLoadedOnce(true)
        return payload
      } catch (error) {
        if (!options?.suppressErrors) {
          throw error
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
  }, [enabled, hasLoadedOnce, refreshInvoice, refreshToken])

  useEffect(() => {
    if (
      invoice.generation?.status !== "REQUESTED" &&
      invoice.generation?.status !== "QUEUED" &&
      invoice.generation?.status !== "PROCESSING"
    ) {
      return undefined
    }

    const interval = window.setInterval(() => {
      void refreshInvoice({ suppressErrors: true })
    }, 3000)

    return () => {
      window.clearInterval(interval)
    }
  }, [invoice.generation?.status, refreshInvoice])

  const queueInvoice = useCallback(async (expectedUpdatedAt: string) => {
    const payload = await requestJson<WorkOrderInvoiceStatusResponse>(`/api/flooring/work-orders/${workOrderId}/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({}, expectedUpdatedAt)),
    })

    setInvoice(payload)
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
