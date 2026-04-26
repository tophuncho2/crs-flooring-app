import { z } from "zod"

/**
 * Outbox + queue contract for "user clicked Save on the cut-logs section
 * with N pending-row changes." The diff is embedded directly in the
 * payload so the worker can apply creates / updates / deletes atomically
 * inside the per-inventory FOR UPDATE lock.
 *
 * Three layers consume this artifact:
 * - The application use case writes the outbox event with this payload
 *   after flipping the touched cut logs PENDING → QUEUED (and stamping
 *   any new-row temp ids to real uuids via `assignCutLogDiffIds`).
 * - The relay claims the event and enqueues a BullMQ job onto
 *   `PENDING_SAVE_CUT_LOG_QUEUE` under the `PENDING_SAVE_CUT_LOG_JOB_NAME`
 *   label.
 * - The worker reads the job, parses via
 *   `parsePendingSaveCutLogBatchPayload`, takes the per-inventory FOR
 *   UPDATE lock, applies the diff (creates / updates / deletes), and
 *   recomputes `inventory.totalCutSum`.
 *
 * Hard upper bounds on each diff side keep a single batch within the
 * worker's transaction budget. `inventoryId` is denormalized so the worker
 * can lock the parent row without an extra read — mirrors `importEntryId`
 * in `materialize-import-batch.ts`.
 *
 * Note: link fields (`workOrderId` / `workOrderItemId`) are NOT part of
 * this payload — link edits flow through their own sync use case (no
 * worker), per intent doc.
 */

export const PENDING_SAVE_CUT_LOG_TOPIC = "flooring.cut-log.pending-save" as const
export const PENDING_SAVE_CUT_LOG_QUEUE = "flooring-cut-log-pending-save" as const
export const PENDING_SAVE_CUT_LOG_JOB_NAME = "pending-save-batch" as const

const isoTimestamp = z.string().datetime()

const CutLogDraftPayload = z.object({
  tempId: z.string().min(1),
  cut: z.string(),
  cost: z.string(),
  freight: z.string(),
  isWaste: z.boolean(),
  notes: z.string(),
})

const CutLogPatchPayload = z.object({
  cut: z.string().optional(),
  cost: z.string().optional(),
  freight: z.string().optional(),
  isWaste: z.boolean().optional(),
  notes: z.string().optional(),
})

const CutLogUpdatePayload = z.object({
  id: z.string().uuid(),
  expectedUpdatedAt: isoTimestamp,
  patch: CutLogPatchPayload,
})

const CutLogDeletePayload = z.object({
  id: z.string().uuid(),
  expectedUpdatedAt: isoTimestamp,
})

export const PendingSaveCutLogBatchPayloadSchema = z.object({
  version: z.literal("v1"),
  topic: z.literal(PENDING_SAVE_CUT_LOG_TOPIC),
  inventoryId: z.string().uuid(),
  diff: z.object({
    added: z.array(CutLogDraftPayload).max(500),
    modified: z.array(CutLogUpdatePayload).max(500),
    deleted: z.array(CutLogDeletePayload).max(500),
  }),
  requestedBy: z.object({
    userId: z.string().uuid(),
    userEmail: z.string().email(),
  }),
  requestedAt: isoTimestamp,
})

export type PendingSaveCutLogBatchPayload = z.infer<
  typeof PendingSaveCutLogBatchPayloadSchema
>

export function parsePendingSaveCutLogBatchPayload(
  value: unknown,
): PendingSaveCutLogBatchPayload {
  return PendingSaveCutLogBatchPayloadSchema.parse(value)
}
