import type { WorkOrderInvoiceStatusRecord } from "@builders/db"

export type WorkOrderInvoiceStatusResponse = {
  invoice: {
    status: WorkOrderInvoiceStatusRecord["invoiceStatus"]
    canOpen: boolean
    requestedAt: string | null
    generatedAt: string | null
    failedAt: string | null
    error: string
    downloadUrl: string | null
  }
}

export function buildWorkOrderInvoiceStatusResponse(
  workOrderId: string,
  status: WorkOrderInvoiceStatusRecord,
): WorkOrderInvoiceStatusResponse {
  const canOpen = status.invoiceStatus === "READY" && Boolean(status.invoiceFileKey)

  return {
    invoice: {
      status: status.invoiceStatus,
      canOpen,
      requestedAt: status.invoiceRequestedAt,
      generatedAt: status.invoiceGeneratedAt,
      failedAt: status.invoiceFailedAt,
      error: status.invoiceError ?? "",
      downloadUrl: canOpen ? `/api/flooring/work-orders/${workOrderId}/invoice/download` : null,
    },
  }
}
