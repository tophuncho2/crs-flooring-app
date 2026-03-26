"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import type { WorkOrderInvoiceStatusResponse } from "./transport/invoice"
import type { WorkOrderDetail } from "./types"

type InvoiceStatusView = WorkOrderInvoiceStatusResponse["invoice"]

function buildInitialInvoiceState(workOrder: WorkOrderDetail): InvoiceStatusView {
  const canOpen = workOrder.invoiceStatus === "READY" && workOrder.hasInvoice

  return {
    status: workOrder.invoiceStatus,
    canOpen,
    requestedAt: workOrder.invoiceRequestedAt,
    generatedAt: workOrder.invoiceGeneratedAt,
    failedAt: workOrder.invoiceFailedAt,
    error: workOrder.invoiceError,
    downloadUrl: canOpen ? `/api/flooring/work-orders/${workOrder.id}/invoice/download` : null,
  }
}

export function useWorkOrderInvoiceController(workOrder: WorkOrderDetail) {
  const initialInvoice = useMemo(
    () => buildInitialInvoiceState(workOrder),
    [
      workOrder.id,
      workOrder.invoiceStatus,
      workOrder.invoiceRequestedAt,
      workOrder.invoiceGeneratedAt,
      workOrder.invoiceFailedAt,
      workOrder.invoiceError,
      workOrder.hasInvoice,
    ],
  )
  const [invoice, setInvoice] = useState<InvoiceStatusView>(initialInvoice)

  useEffect(() => {
    setInvoice(buildInitialInvoiceState(workOrder))
  }, [
    workOrder.id,
    workOrder.invoiceStatus,
    workOrder.invoiceRequestedAt,
    workOrder.invoiceGeneratedAt,
    workOrder.invoiceFailedAt,
    workOrder.invoiceError,
    workOrder.hasInvoice,
  ])

  const refreshInvoice = useCallback(
    async (options?: { suppressErrors?: boolean }) => {
      try {
        const payload = await requestJson<WorkOrderInvoiceStatusResponse>(`/api/flooring/work-orders/${workOrder.id}/invoice`, {
          cache: "no-store",
        })

        if (payload?.invoice) {
          setInvoice(payload.invoice)
          return payload.invoice
        }
      } catch (error) {
        if (!options?.suppressErrors) {
          throw error
        }
      }

      return null
    },
    [workOrder.id],
  )

  useEffect(() => {
    void refreshInvoice({ suppressErrors: true })
  }, [refreshInvoice])

  useEffect(() => {
    if (invoice.status !== "QUEUED" && invoice.status !== "PROCESSING") {
      return undefined
    }

    const interval = window.setInterval(() => {
      void refreshInvoice({ suppressErrors: true })
    }, 3000)

    return () => {
      window.clearInterval(interval)
    }
  }, [invoice.status, refreshInvoice])

  const queueInvoice = useCallback(async () => {
    const payload = await requestJson<WorkOrderInvoiceStatusResponse>(`/api/flooring/work-orders/${workOrder.id}/invoice`, {
      method: "POST",
    })

    if (!payload?.invoice) {
      throw new Error("Failed to queue invoice generation")
    }

    setInvoice(payload.invoice)
    return payload.invoice
  }, [workOrder.id])

  const openInvoice = useCallback(() => {
    if (!invoice.downloadUrl) {
      return
    }

    window.open(invoice.downloadUrl, "_blank", "noopener")
  }, [invoice.downloadUrl])

  return {
    invoice,
    isGenerating: invoice.status === "QUEUED" || invoice.status === "PROCESSING",
    queueInvoice,
    openInvoice,
    refreshInvoice,
  }
}
