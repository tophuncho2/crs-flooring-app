"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import type { WorkOrderInvoiceStatusResponse } from "./transport/invoice"

type InvoiceStatusView = WorkOrderInvoiceStatusResponse

const EMPTY_INVOICE_STATE: InvoiceStatusView = {
  sourceVersion: "",
  generation: null,
  artifact: null,
  canOpen: false,
}

export function useWorkOrderInvoiceController(workOrderId: string, refreshToken: string) {
  const initialInvoice = useMemo(() => EMPTY_INVOICE_STATE, [])
  const [invoice, setInvoice] = useState<InvoiceStatusView>(initialInvoice)

  const refreshInvoice = useCallback(
    async (options?: { suppressErrors?: boolean }) => {
      try {
        const payload = await requestJson<WorkOrderInvoiceStatusResponse>(`/api/flooring/work-orders/${workOrderId}/invoice`, {
          cache: "no-store",
        })

        setInvoice(payload)
        return payload
      } catch (error) {
        if (!options?.suppressErrors) {
          throw error
        }
      }

      return null
    },
    [workOrderId],
  )

  useEffect(() => {
    void refreshInvoice({ suppressErrors: true })
  }, [refreshInvoice, refreshToken])

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

  const queueInvoice = useCallback(async () => {
    const payload = await requestJson<WorkOrderInvoiceStatusResponse>(`/api/flooring/work-orders/${workOrderId}/invoice`, {
      method: "POST",
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
    isGenerating:
      invoice.generation?.status === "REQUESTED" ||
      invoice.generation?.status === "QUEUED" ||
      invoice.generation?.status === "PROCESSING",
    queueInvoice,
    openInvoice,
    refreshInvoice,
  }
}
