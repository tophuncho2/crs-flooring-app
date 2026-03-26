export const INVOICE_GENERATION_QUEUE = "flooring-invoice-generation"
export const GENERATE_WORK_ORDER_INVOICE_JOB = "generate-work-order-invoice"

export const INVOICE_GENERATION_RETRY_POLICY = {
  attempts: 5,
  backoff: {
    type: "exponential" as const,
    delay: 30_000,
  },
  removeOnComplete: 100,
  removeOnFail: 1_000,
} as const

export type GenerateWorkOrderInvoiceJobV1 = {
  version: "v1"
  jobName: typeof GENERATE_WORK_ORDER_INVOICE_JOB
  idempotencyKey: string
  createdAt: string
  workOrderId: string
  triggeredByUserId: string
  invoiceSourceUpdatedAt: string
}
