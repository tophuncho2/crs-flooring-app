import { z } from "zod"

/**
 * Outbox + queue contract for "user queued N cut logs for finalization."
 *
 * One topic-aware artifact, consumed by three layers:
 * - The application use case writes the outbox event with this payload
 *   after flipping the selected cut logs PENDING → QUEUED.
 * - The relay claims the event and enqueues a BullMQ job onto
 *   `FINALIZE_CUT_LOG_QUEUE` under the `FINALIZE_CUT_LOG_JOB_NAME` label.
 * - The worker reads the job, parses via
 *   `parseFinalizeCutLogBatchPayload`, takes the per-inventory FOR UPDATE
 *   lock, and stamps every cut log with `before` / `after` /
 *   `finalCutSequence` / `status = FINAL` / `isFinal = true`.
 *
 * Hard upper bound on `cutLogIds` keeps a single batch within the worker's
 * transaction budget. `inventoryId` is denormalized so the worker can lock
 * the parent row without an extra read — mirrors `importEntryId` in
 * `materialize-import-batch.ts`.
 */

export const FINALIZE_CUT_LOG_TOPIC = "flooring.cut-log.finalize" as const
export const FINALIZE_CUT_LOG_QUEUE = "flooring-cut-log-finalize" as const
export const FINALIZE_CUT_LOG_JOB_NAME = "finalize-batch" as const

const isoTimestamp = z.string().datetime()

export const FinalizeCutLogBatchPayloadSchema = z.object({
  version: z.literal("v1"),
  topic: z.literal(FINALIZE_CUT_LOG_TOPIC),
  inventoryId: z.string().uuid(),
  cutLogIds: z.array(z.string().uuid()).min(1).max(500),
  requestedBy: z.object({
    userId: z.string().uuid(),
    userEmail: z.string().email(),
  }),
  requestedAt: isoTimestamp,
})

export type FinalizeCutLogBatchPayload = z.infer<typeof FinalizeCutLogBatchPayloadSchema>

export function parseFinalizeCutLogBatchPayload(
  value: unknown,
): FinalizeCutLogBatchPayload {
  return FinalizeCutLogBatchPayloadSchema.parse(value)
}
