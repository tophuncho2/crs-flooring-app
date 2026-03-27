import type { WorkOrderInvoiceViewRecord } from "@builders/db"

export type WorkOrderInvoiceStatusResponse = {
  sourceVersion: string
  generation: {
    id: string
    status: NonNullable<WorkOrderInvoiceViewRecord["generation"]>["status"]
    requestedAt: string
    queuedAt: string | null
    startedAt: string | null
    completedAt: string | null
    failedAt: string | null
    error: string
  } | null
  artifact: {
    id: string
    fileName: string
    createdAt: string
    downloadUrl: string
  } | null
  canOpen: boolean
}

export function buildWorkOrderInvoiceStatusResponse(
  workOrderId: string,
  invoice: WorkOrderInvoiceViewRecord,
): WorkOrderInvoiceStatusResponse {
  const artifact = invoice.artifact
    ? {
        id: invoice.artifact.id,
        fileName: invoice.artifact.fileName,
        createdAt: invoice.artifact.createdAt,
        downloadUrl: `/api/flooring/work-orders/${workOrderId}/invoice/download`,
      }
    : null

  return {
    sourceVersion: invoice.sourceVersion,
    generation: invoice.generation
      ? {
          id: invoice.generation.id,
          status: invoice.generation.status,
          requestedAt: invoice.generation.requestedAt,
          queuedAt: invoice.generation.queuedAt,
          startedAt: invoice.generation.startedAt,
          completedAt: invoice.generation.completedAt,
          failedAt: invoice.generation.failedAt,
          error: invoice.generation.failureMessage ?? "",
        }
      : null,
    artifact,
    canOpen: Boolean(artifact),
  }
}
