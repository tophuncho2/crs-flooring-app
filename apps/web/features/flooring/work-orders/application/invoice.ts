import {
  failWorkOrderInvoiceGeneration,
  getWorkOrderInvoiceStatus,
  queueWorkOrderInvoiceGeneration,
} from "@builders/db"
import {
  GENERATE_WORK_ORDER_INVOICE_JOB,
  type GenerateWorkOrderInvoiceJobV1,
} from "@builders/domain"
import { enqueueWorkOrderInvoiceJob } from "@/server/queues/invoice-queue"

function buildInvoiceIdempotencyKey(workOrderId: string, invoiceSourceUpdatedAt: string) {
  return `invoice:v1:${workOrderId}:${invoiceSourceUpdatedAt}`
}

export async function getWorkOrderInvoiceStatusUseCase(workOrderId: string) {
  return getWorkOrderInvoiceStatus(workOrderId)
}

export async function queueWorkOrderInvoiceUseCase(workOrderId: string, triggeredByUserId: string) {
  const current = await getWorkOrderInvoiceStatus(workOrderId)
  const idempotencyKey = buildInvoiceIdempotencyKey(workOrderId, current.invoiceSourceUpdatedAt)

  if (
    current.invoiceIdempotencyKey === idempotencyKey &&
    (current.invoiceStatus === "QUEUED" || current.invoiceStatus === "PROCESSING" || current.invoiceStatus === "READY")
  ) {
    return current
  }

  const queued = await queueWorkOrderInvoiceGeneration(workOrderId, {
    idempotencyKey,
  })

  const payload: GenerateWorkOrderInvoiceJobV1 = {
    version: "v1",
    jobName: GENERATE_WORK_ORDER_INVOICE_JOB,
    idempotencyKey,
    createdAt: new Date().toISOString(),
    workOrderId,
    triggeredByUserId,
    invoiceSourceUpdatedAt: queued.invoiceSourceUpdatedAt,
  }

  try {
    await enqueueWorkOrderInvoiceJob(payload)
    return queued
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to enqueue invoice generation"
    await failWorkOrderInvoiceGeneration(workOrderId, {
      idempotencyKey,
      errorMessage: message,
    })
    throw error
  }
}
