import { z } from "zod"

/**
 * Outbox + queue contract for "user clicked Finalize on a single pending
 * cut log from a work-order record view." Finalization is one-at-a-time:
 * the side panel finalizes exactly one cut log per click.
 *
 * The worker takes the parent inventory's row lock, walks the inventory's
 * existing FINAL rows to compute `runningBalance` + `nextSequence`, then
 * stamps `before` / `after` / `finalCutSequence` and flips status to
 * FINAL. WOMI status is no longer mutated by this flow — the inventory
 * lock is the sole correctness mechanism, and TX rollback is the entire
 * failure model.
 *
 * `requestKey` is a client-generated string per click, folded into the
 * outbox idempotency key so a duplicate submit silently dedupes at the
 * outbox layer.
 *
 * The constants below keep their `_BATCH_` suffix in the underlying
 * string values (queue/topic/job-name) so existing Redis keys and
 * DISPATCHED outbox rows continue to route correctly. The TS identifiers
 * have been renamed to drop the lie.
 */

export const FINALIZE_WORK_ORDER_CUT_LOG_TOPIC =
  "flooring.work-order.cut-log.finalize" as const
export const FINALIZE_WORK_ORDER_CUT_LOG_QUEUE =
  "flooring-work-order-cut-log-finalize" as const
export const FINALIZE_WORK_ORDER_CUT_LOG_JOB_NAME =
  "wo-cut-log-finalize-batch" as const

const isoTimestamp = z.string().datetime()

export const FinalizeWorkOrderCutLogPayloadSchema = z.object({
  version: z.literal("v1"),
  topic: z.literal(FINALIZE_WORK_ORDER_CUT_LOG_TOPIC),
  workOrderId: z.string().uuid(),
  requestKey: z.string().min(1),
  cutLogId: z.string().uuid(),
  requestedBy: z.object({
    userId: z.string().uuid(),
    userEmail: z.string().email(),
  }),
  requestedAt: isoTimestamp,
})

export type FinalizeWorkOrderCutLogPayload = z.infer<
  typeof FinalizeWorkOrderCutLogPayloadSchema
>

export function parseFinalizeWorkOrderCutLogPayload(
  value: unknown,
): FinalizeWorkOrderCutLogPayload {
  return FinalizeWorkOrderCutLogPayloadSchema.parse(value)
}
