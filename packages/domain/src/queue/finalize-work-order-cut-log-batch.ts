import { z } from "zod"

/**
 * Outbox + queue contract for "user clicked Finalize on a selection of
 * pending cut logs from a work-order record view." The selection may
 * span multiple WOMIs and multiple inventories under a single WO.
 *
 * Distinct from the inventory-side `flooring.cut-log.finalize` payload:
 * this WO-scoped variant does not denormalize a single `inventoryId` —
 * the worker derives the touched inventory set from the cut log rows
 * themselves and locks them in deterministic ID-sorted order. Each
 * touched WOMI is flipped to status `FINALIZING` by the producer and
 * back to `IDLE` (or `FAILED` on throw) by the worker.
 *
 * `requestKey` is a client-generated UUID per submit, folded into the
 * outbox idempotency key so a duplicate submit silently dedupes.
 */

export const FINALIZE_WORK_ORDER_CUT_LOG_BATCH_TOPIC =
  "flooring.work-order.cut-log.finalize" as const
export const FINALIZE_WORK_ORDER_CUT_LOG_BATCH_QUEUE =
  "flooring-work-order-cut-log-finalize" as const
export const FINALIZE_WORK_ORDER_CUT_LOG_BATCH_JOB_NAME =
  "wo-cut-log-finalize-batch" as const

const isoTimestamp = z.string().datetime()

export const FinalizeWorkOrderCutLogBatchPayloadSchema = z.object({
  version: z.literal("v1"),
  topic: z.literal(FINALIZE_WORK_ORDER_CUT_LOG_BATCH_TOPIC),
  workOrderId: z.string().uuid(),
  requestKey: z.string().uuid(),
  cutLogIds: z.array(z.string().uuid()).min(1).max(500),
  requestedBy: z.object({
    userId: z.string().uuid(),
    userEmail: z.string().email(),
  }),
  requestedAt: isoTimestamp,
})

export type FinalizeWorkOrderCutLogBatchPayload = z.infer<
  typeof FinalizeWorkOrderCutLogBatchPayloadSchema
>

export function parseFinalizeWorkOrderCutLogBatchPayload(
  value: unknown,
): FinalizeWorkOrderCutLogBatchPayload {
  return FinalizeWorkOrderCutLogBatchPayloadSchema.parse(value)
}
