import { z } from "zod"

export const WORK_ORDER_AUTO_ALLOCATION_QUEUE = "flooring-work-order-auto-allocation"
export const AUTO_ALLOCATE_WORK_ORDER_JOB = "auto-allocate-work-order"
export const WORK_ORDER_AUTO_ALLOCATION_REQUESTED_OUTBOX_TOPIC = "work-order.allocation.requested.v1"
export const WORK_ORDER_AUTO_ALLOCATION_AGGREGATE_TYPE = "flooringWorkOrderAllocationRun"

export const WORK_ORDER_AUTO_ALLOCATION_RETRY_POLICY = {
  attempts: 5,
  backoff: {
    type: "exponential" as const,
    delay: 30_000,
  },
  removeOnComplete: 100,
  removeOnFail: 1_000,
} as const

export const WORK_ORDER_AUTO_ALLOCATION_STATUS_VALUES = [
  "REQUESTED",
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
] as const

export type WorkOrderAutoAllocationStatus = (typeof WORK_ORDER_AUTO_ALLOCATION_STATUS_VALUES)[number]

export function isWorkOrderAutoAllocationPendingStatus(
  status: WorkOrderAutoAllocationStatus | null | undefined,
) {
  return status === "REQUESTED" || status === "QUEUED" || status === "PROCESSING"
}

export function buildWorkOrderAutoAllocationIdempotencyKey(runId: string) {
  return `work-order-allocation:v1:${runId}`
}

const isoTimestamp = z.string().min(1)

export const workOrderAutoAllocationRequestedOutboxEventSchema = z.object({
  version: z.literal("v1"),
  topic: z.literal(WORK_ORDER_AUTO_ALLOCATION_REQUESTED_OUTBOX_TOPIC),
  requestId: z.string().min(1),
  allocationRunId: z.string().uuid(),
  workOrderId: z.string().uuid(),
  requestedByUserId: z.string().uuid(),
  idempotencyKey: z.string().min(1),
  sourceVersion: isoTimestamp,
  requestedAt: isoTimestamp,
})

export type WorkOrderAutoAllocationRequestedOutboxEventV1 = z.infer<
  typeof workOrderAutoAllocationRequestedOutboxEventSchema
>

export const autoAllocateWorkOrderJobSchema = z.object({
  version: z.literal("v1"),
  jobName: z.literal(AUTO_ALLOCATE_WORK_ORDER_JOB),
  requestId: z.string().min(1),
  allocationRunId: z.string().uuid(),
  workOrderId: z.string().uuid(),
  requestedByUserId: z.string().uuid(),
  idempotencyKey: z.string().min(1),
  sourceVersion: isoTimestamp,
  queuedAt: isoTimestamp,
})

export type AutoAllocateWorkOrderJobV1 = z.infer<typeof autoAllocateWorkOrderJobSchema>

export function parseWorkOrderAutoAllocationRequestedOutboxEvent(
  value: unknown,
): WorkOrderAutoAllocationRequestedOutboxEventV1 {
  return workOrderAutoAllocationRequestedOutboxEventSchema.parse(value)
}

export function parseAutoAllocateWorkOrderJob(value: unknown): AutoAllocateWorkOrderJobV1 {
  return autoAllocateWorkOrderJobSchema.parse(value)
}
