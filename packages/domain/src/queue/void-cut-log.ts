import { z } from "zod"

/**
 * Outbox + queue contract for "user voided one cut log."
 *
 * Voids are ALWAYS one cut log at a time per intent doc — no batch
 * variant. The single-row constraint is enforced by the payload shape
 * (`cutLogId` is a single uuid, not an array).
 *
 * Three layers consume this artifact:
 * - The application use case writes the outbox event with this payload
 *   after flipping the cut log PENDING/FINAL → QUEUED.
 * - The relay claims the event and enqueues a BullMQ job onto
 *   `VOID_CUT_LOG_QUEUE` under the `VOID_CUT_LOG_JOB_NAME` label.
 * - The worker reads the job, parses via `parseVoidCutLogPayload`, takes
 *   the per-inventory FOR UPDATE lock, applies `buildVoidedCutLogPatch`
 *   (`cut → "0"`, `coverageCut/cost/freight → null`, `void = true`,
 *   `status = VOID`), and recomputes `inventory.totalCutSum` (now lower
 *   by the erased cut amount).
 *
 * `inventoryId` is denormalized so the worker can lock the parent row
 * without an extra read — mirrors `importEntryId` in
 * `materialize-import-batch.ts`.
 */

export const VOID_CUT_LOG_TOPIC = "flooring.cut-log.void" as const
export const VOID_CUT_LOG_QUEUE = "flooring-cut-log-void" as const
export const VOID_CUT_LOG_JOB_NAME = "void" as const

const isoTimestamp = z.string().datetime()

export const VoidCutLogPayloadSchema = z.object({
  version: z.literal("v1"),
  topic: z.literal(VOID_CUT_LOG_TOPIC),
  inventoryId: z.string().uuid(),
  cutLogId: z.string().uuid(),
  requestedBy: z.object({
    userId: z.string().uuid(),
    userEmail: z.string().email(),
  }),
  requestedAt: isoTimestamp,
})

export type VoidCutLogPayload = z.infer<typeof VoidCutLogPayloadSchema>

export function parseVoidCutLogPayload(value: unknown): VoidCutLogPayload {
  return VoidCutLogPayloadSchema.parse(value)
}
