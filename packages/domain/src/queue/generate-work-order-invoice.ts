import { z } from "zod"

export const INVOICE_GENERATION_QUEUE = "flooring-invoice-generation"
export const GENERATE_WORK_ORDER_INVOICE_JOB = "generate-work-order-invoice"
export const INVOICE_GENERATION_REQUESTED_OUTBOX_TOPIC = "invoice.generation.requested.v1"
export const INVOICE_GENERATION_AGGREGATE_TYPE = "flooringInvoiceGeneration"

export const INVOICE_GENERATION_RETRY_POLICY = {
  attempts: 5,
  backoff: {
    type: "exponential" as const,
    delay: 30_000,
  },
  removeOnComplete: 100,
  removeOnFail: 1_000,
} as const

export const OUTBOX_RETRY_POLICY = {
  maxAttempts: 5,
  baseDelayMs: 30_000,
} as const

export const INVOICE_GENERATION_STATUS_VALUES = [
  "REQUESTED",
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "SUPERSEDED",
] as const

export type InvoiceGenerationStatus = (typeof INVOICE_GENERATION_STATUS_VALUES)[number]

export function isInvoiceGenerationPendingStatus(status: InvoiceGenerationStatus | null | undefined) {
  return status === "REQUESTED" || status === "QUEUED" || status === "PROCESSING"
}

export function buildInvoiceGenerationIdempotencyKey(workOrderId: string, sourceVersion: string) {
  return `invoice:v2:${workOrderId}:${sourceVersion}`
}

const isoTimestamp = z.string().min(1)

export const invoiceGenerationRequestedOutboxEventSchema = z.object({
  version: z.literal("v1"),
  topic: z.literal(INVOICE_GENERATION_REQUESTED_OUTBOX_TOPIC),
  requestId: z.string().min(1),
  generationId: z.string().uuid(),
  workOrderId: z.string().uuid(),
  requestedByUserId: z.string().uuid(),
  idempotencyKey: z.string().min(1),
  sourceVersion: isoTimestamp,
  requestedAt: isoTimestamp,
})

export type InvoiceGenerationRequestedOutboxEventV1 = z.infer<typeof invoiceGenerationRequestedOutboxEventSchema>

export const generateWorkOrderInvoiceJobSchema = z.object({
  version: z.literal("v1"),
  jobName: z.literal(GENERATE_WORK_ORDER_INVOICE_JOB),
  requestId: z.string().min(1),
  generationId: z.string().uuid(),
  workOrderId: z.string().uuid(),
  requestedByUserId: z.string().uuid(),
  idempotencyKey: z.string().min(1),
  sourceVersion: isoTimestamp,
  queuedAt: isoTimestamp,
})

export type GenerateWorkOrderInvoiceJobV1 = z.infer<typeof generateWorkOrderInvoiceJobSchema>

export function parseInvoiceGenerationRequestedOutboxEvent(
  value: unknown,
): InvoiceGenerationRequestedOutboxEventV1 {
  return invoiceGenerationRequestedOutboxEventSchema.parse(value)
}

export function parseGenerateWorkOrderInvoiceJob(value: unknown): GenerateWorkOrderInvoiceJobV1 {
  return generateWorkOrderInvoiceJobSchema.parse(value)
}

export function calculateOutboxRetryAvailableAt(attemptCount: number, now: Date = new Date()) {
  const exponent = Math.max(0, attemptCount - 1)
  const delayMs = OUTBOX_RETRY_POLICY.baseDelayMs * 2 ** exponent
  return new Date(now.getTime() + delayMs)
}
